import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  LoadingButton,
  PageHeader,
  Skeleton,
  StatusPill,
  useDisclosure,
} from '@/components/ui';
import { Plus, Users, Layers, Pencil, Trash2 } from 'lucide-react';

type SisClass = {
  id: string;
  name: string;
  stream: string | null;
  code: string;
  academic_year: string | null;
  status: string | null;
};

export default function Classes() {
  const qc = useQueryClient();
  const { open: showForm, show, hide } = useDisclosure();
  const confirmDelete = useDisclosure();
  const [editing, setEditing] = useState<SisClass | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SisClass | null>(null);
  const [form, setForm] = useState({ name: '', code: '', stream: '', academic_year: '', status: 'active' });

  const { data: classes = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['sis_classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sis_classes')
        .select('id,name,stream,code,academic_year,status')
        .order('name');
      if (error) throw error;
      return (data ?? []) as SisClass[];
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['sis_classes', 'enrollment-counts'],
    enabled: classes.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sis_enrollments')
        .select('class_id')
        .in('class_id', classes.map((c) => c.id))
        .eq('status', 'active');
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const e of (data ?? []) as { class_id: string }[]) {
        counts.set(e.class_id, (counts.get(e.class_id) ?? 0) + 1);
      }
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await supabase.from('sis_classes').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class created');
      qc.invalidateQueries({ queryKey: ['sis_classes'] });
      hide();
      resetForm();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...row }: Record<string, unknown>) => {
      const { error } = await supabase.from('sis_classes').update(row).eq('id', id as string);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class updated');
      qc.invalidateQueries({ queryKey: ['sis_classes'] });
      hide();
      resetForm();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sis_classes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class deleted');
      qc.invalidateQueries({ queryKey: ['sis_classes'] });
      confirmDelete.hide();
      setPendingDelete(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function resetForm() {
    setForm({ name: '', code: '', stream: '', academic_year: '', status: 'active' });
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    show();
  }

  function openEdit(cls: SisClass) {
    setEditing(cls);
    setForm({
      name: cls.name,
      code: cls.code,
      stream: cls.stream ?? '',
      academic_year: cls.academic_year ?? '',
      status: cls.status ?? 'active',
    });
    show();
  }

  function askDelete(cls: SisClass) {
    setPendingDelete(cls);
    confirmDelete.show();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Class name and code are required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      stream: form.stream.trim() || null,
      academic_year: form.academic_year.trim() || null,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;

  const yearGroups = classes.reduce<Record<string, SisClass[]>>((acc, cls) => {
    const g = cls.academic_year || 'No academic year';
    if (!acc[g]) acc[g] = [];
    acc[g].push(cls);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academics"
        title="Classes"
        description="Organize students into classes, streams, and academic years."
        action={<Button onClick={openCreate}><Plus className="size-4" />Add Class</Button>}
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Edit Class' : 'New Class'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Class name" htmlFor="class-name">
                <Input
                  id="class-name"
                  placeholder="e.g. Form 1 North"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Code" hint="Unique per school, e.g. F1N." htmlFor="class-code">
                <Input
                  id="class-code"
                  placeholder="e.g. F1N"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </Field>
              <Field label="Stream" htmlFor="class-stream">
                <Input
                  id="class-stream"
                  placeholder="e.g. North"
                  value={form.stream}
                  onChange={(e) => setForm({ ...form, stream: e.target.value })}
                />
              </Field>
              <Field label="Academic year" htmlFor="class-year">
                <Input
                  id="class-year"
                  placeholder="e.g. 2026"
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                />
              </Field>
              <Field label="Status" htmlFor="class-status">
                <select
                  id="class-status"
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <LoadingButton loading={loading}>{editing ? 'Update' : 'Create'}</LoadingButton>
                <Button type="button" variant="outline" onClick={() => { hide(); resetForm(); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {pendingDelete && confirmDelete.open && (
        <ConfirmDialog
          title="Delete Class"
          description={`Delete "${pendingDelete.name}"? Enrolled students keep their records, but the class will be removed.`}
          confirmLabel="Delete"
          tone="destructive"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
          onClose={() => { confirmDelete.hide(); setPendingDelete(null); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Could not load classes"
          description="Something went wrong fetching classes. Try again."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create your first class to start organizing students."
          action={<Button onClick={openCreate}><Plus className="size-4" />Add Class</Button>}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(yearGroups).map(([year, yearClasses]) => (
            <section key={year}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{year}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {yearClasses.map((cls) => {
                  const count = enrollmentCounts?.get(cls.id) ?? 0;
                  return (
                    <Card key={cls.id} className="relative overflow-hidden transition-shadow hover:shadow-md">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{cls.name}</h3>
                            <p className="text-sm text-muted-foreground">Code: {cls.code}</p>
                            {cls.stream && <p className="text-sm text-muted-foreground">Stream: {cls.stream}</p>}
                            {cls.status && (
                              <div className="pt-1"><StatusPill status={cls.status} /></div>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(cls)} aria-label={`Edit ${cls.name}`}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => askDelete(cls)} aria-label={`Delete ${cls.name}`}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4 border-t pt-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="size-4" />
                            <span>{count} students</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Layers className="size-4" />
                            <span>{cls.academic_year ?? 'No year'}</span>
                          </div>
                        </div>
                      </CardContent>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20">
                        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (count / 50) * 100)}%` }} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
