import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import { StudentCard } from '@/components/StudentCard';
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SkeletonList,
  StatusPill,
} from '@/components/ui';
import { sanitizeLike } from '@/hooks/useStudents';
import {
  Search,
  Users,
  LayoutGrid,
  Table,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Student = {
  id: string;
  admission_no: string | null;
  first_name: string | null;
  last_name: string | null;
  grade: string | null;
  status: string | null;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
};

type SisClass = {
  id: string;
  name: string | null;
  stream: string | null;
  code: string | null;
  academic_year: string | null;
};

const PAGE_SIZE = 24;
const STATUS_OPTIONS = ['active', 'inactive'];

export default function Students() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ admission_no: '', first_name: '', last_name: '', grade: '' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['students', page, search, classFilter, statusFilter],
    queryFn: async () => {
      // students has no class_id column — resolve the class filter through sis_enrollments.
      let idsInClass: string[] | null = null;
      if (classFilter) {
        const { data: enr, error: enrError } = await supabase
          .from('sis_enrollments')
          .select('student_id')
          .eq('class_id', classFilter)
          .eq('status', 'active')
          .limit(2000);
        if (enrError) throw enrError;
        idsInClass = [...new Set(((enr ?? []) as { student_id: string }[]).map((e) => e.student_id))];
        if (idsInClass.length === 0) return { rows: [] as Student[], total: 0 };
      }

      const term = sanitizeLike(search.trim());
      let query = supabase
        .from('students')
        .select('id,admission_no,first_name,last_name,grade,status', { count: 'exact' })
        .is('deleted_at', null)
        .order('first_name');

      if (idsInClass) {
        const slice = idsInClass.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        if (slice.length === 0) return { rows: [] as Student[], total: idsInClass.length };
        query = query.in('id', slice);
      } else {
        query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      }

      if (term) {
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,admission_no.ilike.%${term}%`);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: rows, count, error } = await query;
      if (error) throw error;
      const list = (rows ?? []) as Omit<Student, 'className' | 'parentName' | 'parentPhone'>[];
      const total = idsInClass ? idsInClass.length : count ?? 0;

      // Enrich: active enrollment class name + primary guardian, in two batched lookups.
      const studentIds = list.map((s) => s.id);
      const classNameByStudent = new Map<string, string>();
      const parentByStudent = new Map<string, { name: string | null; phone: string | null }>();
      if (studentIds.length > 0) {
        const [{ data: enrollments }, { data: links }] = await Promise.all([
          supabase.from('sis_enrollments').select('student_id,class_id,sis_classes(name)').in('student_id', studentIds).eq('status', 'active'),
          supabase.from('guardians_link').select('student_id,parent_id,parents(full_name,phone)').in('student_id', studentIds),
        ]);
        for (const e of (enrollments ?? []) as { student_id: string; sis_classes?: { name: string | null } | { name: string | null }[] | null }[]) {
          const c = Array.isArray(e.sis_classes) ? e.sis_classes[0] : e.sis_classes;
          if (c?.name) classNameByStudent.set(e.student_id, c.name);
        }
        for (const l of (links ?? []) as { student_id: string; parents?: { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null }[]) {
          if (parentByStudent.has(l.student_id)) continue;
          const p = Array.isArray(l.parents) ? l.parents[0] : l.parents;
          parentByStudent.set(l.student_id, { name: p?.full_name ?? null, phone: p?.phone ?? null });
        }
      }

      return {
        rows: list.map((s) => ({
          ...s,
          className: classNameByStudent.get(s.id) ?? null,
          parentName: parentByStudent.get(s.id)?.name ?? null,
          parentPhone: parentByStudent.get(s.id)?.phone ?? null,
        })) as Student[],
        total,
      };
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['sis_classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sis_classes').select('id,name,stream,code,academic_year').order('name');
      if (error) throw error;
      return (data ?? []) as SisClass[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.admission_no.trim() || !createForm.first_name.trim() || !createForm.last_name.trim()) {
        throw new Error('Admission number, first name and last name are required.');
      }
      const { error } = await supabase.from('students').insert({
        admission_no: createForm.admission_no.trim(),
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        grade: createForm.grade.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Student added.');
      setCreateForm({ admission_no: '', first_name: '', last_name: '', grade: '' });
      setShowCreate(false);
      void qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast.error(`Could not add student: ${(e as Error).message}`),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const students = data?.rows ?? [];
  const activeFilters = [classFilter, statusFilter].filter(Boolean).length;

  function clearFilters() {
    setClassFilter('');
    setStatusFilter('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${data?.total?.toLocaleString() ?? 0} learners on roll`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="size-4" />
              Add Student
            </Button>
            <ButtonLink to="/admin/students/import" variant="outline">
              <Upload className="size-4" />
              Import
            </ButtonLink>
          </div>
        }
      />

      {showCreate && (
        <ConfirmDialog
          title="Add Student"
          description={
            <span className="grid gap-3 pt-2">
              <Field label="Admission number" htmlFor="new-admission-no">
                <Input
                  id="new-admission-no"
                  placeholder="e.g. ADM001"
                  value={createForm.admission_no}
                  onChange={(e) => setCreateForm({ ...createForm, admission_no: e.target.value })}
                />
              </Field>
              <span className="grid gap-3 sm:grid-cols-2">
                <Field label="First name" htmlFor="new-first-name">
                  <Input
                    id="new-first-name"
                    placeholder="Jane"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  />
                </Field>
                <Field label="Last name" htmlFor="new-last-name">
                  <Input
                    id="new-last-name"
                    placeholder="Doe"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  />
                </Field>
              </span>
              <Field label="Grade" hint="Free text, e.g. Grade 3." htmlFor="new-grade">
                <Input
                  id="new-grade"
                  placeholder="Grade 3"
                  value={createForm.grade}
                  onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
                />
              </Field>
            </span>
          }
          confirmLabel="Add Student"
          loading={createMutation.isPending}
          onConfirm={() => createMutation.mutate()}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, admission no…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
              aria-label="Filter by class"
            >
              <option value="">All classes</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>{c.name ?? c.code ?? 'Unnamed class'}</option>
              ))}
            </select>

            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              aria-label="Filter by status"
            >
              <option value="">All status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-3" />
                Clear
              </Button>
            )}

            <div className="flex rounded-md border" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                aria-pressed={viewMode === 'card'}
                className={cn(
                  'flex items-center justify-center px-2.5 py-1.5 text-sm transition-colors',
                  viewMode === 'card'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label="Card view"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={cn(
                  'flex items-center justify-center px-2.5 py-1.5 text-sm transition-colors',
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label="Table view"
              >
                <Table className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonList count={6} variant="card" />
      ) : isError ? (
        <EmptyState
          title="Could not load students"
          description="Something went wrong fetching the student register. Your data is safe — try again."
          action={
            <Button onClick={() => refetch()}>
              <Users className="size-4" />
              Retry
            </Button>
          }
        />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          description={
            search || activeFilters > 0
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first student.'
          }
          action={
            <ButtonLink to="/admin/students/import">
              <Users className="size-4" />
              Import Students
            </ButtonLink>
          }
        />
      ) : viewMode === 'card' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s) => (
              <Link key={s.id} to={`/admin/students/${s.id}`} className="block">
                <StudentCard
                  student={{
                    id: s.id,
                    name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
                    admissionNo: s.admission_no ?? undefined,
                    className: s.className ?? s.grade ?? undefined,
                    status: s.status ?? undefined,
                  }}
                />
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page} of {totalPages} · {data?.total ?? 0} learners
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-3" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <DataTable
            columns={['Admission No', 'Name', 'Class', 'Status', 'Parent', 'Phone', '']}
            rows={students.map((s) => [
              s.admission_no ?? '—',
              `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown',
              s.className ?? s.grade ?? '—',
              s.status ? <StatusPill key={`st-${s.id}`} status={s.status} /> : '—',
              s.parentName ?? '—',
              s.parentPhone ?? '—',
              <Link
                key={`v-${s.id}`}
                to={`/admin/students/${s.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View
              </Link>,
            ])}
            pagination="server"
            empty="No students match your filters."
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page} of {totalPages} · {data?.total ?? 0} learners
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-3" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
</div>
  );
}
