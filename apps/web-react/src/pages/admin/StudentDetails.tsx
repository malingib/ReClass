import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/hooks/useStudents';
import { useSchool } from '@/hooks/useSchool';
import { DataTable } from '@/components/DataTable';
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
  Skeleton,
  StatusPill,
} from '@/components/ui';
import {
  ArrowLeft,
  User,
  GraduationCap,
  DollarSign,
  FileText,
  Calendar,
  Activity,
  Printer,
  ArrowRightLeft,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dateKE } from '@/lib/format';

type Tab = 'overview' | 'attendance' | 'fees' | 'exams' | 'documents' | 'activities';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'fees', label: 'Fees', icon: DollarSign },
  { id: 'exams', label: 'Exams', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'activities', label: 'Activities', icon: Activity },
];

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function StudentDetails() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useStudent(id);
  const { data: school } = useSchool();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', admission_no: '', grade: '', status: 'active' });
  const [transferForm, setTransferForm] = useState({ destination: '', reason: '', exit_date: new Date().toISOString().slice(0, 10) });
  const [certificateRef, setCertificateRef] = useState('');

  const { data: classNames } = useQuery({
    queryKey: ['sis_classes'],
    enabled: !!data?.student,
    queryFn: async () => {
      const { data: rows, error } = await supabase.from('sis_classes').select('id,name');
      if (error) throw error;
      return new Map(((rows ?? []) as { id: string; name: string | null }[]).map((c) => [c.id, c.name ?? '—']));
    },
  });

  function openEdit() {
    const s = (data?.student ?? {}) as Record<string, string | null>;
    setEditForm({
      first_name: (s.first_name as string) ?? '',
      last_name: (s.last_name as string) ?? '',
      admission_no: (s.admission_no as string) ?? '',
      grade: (s.grade as string) ?? '',
      status: (s.status as string) ?? 'active',
    });
    setShowEdit(true);
  }

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.admission_no.trim()) {
        throw new Error('First name, last name and admission number are required.');
      }
      const { error } = await supabase
        .from('students')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          admission_no: editForm.admission_no.trim(),
          grade: editForm.grade.trim() || null,
          status: editForm.status,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Student updated.');
      setShowEdit(false);
      void qc.invalidateQueries({ queryKey: ['student', id] });
      void qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast.error(`Update failed: ${(e as Error).message}`),
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferForm.exit_date) throw new Error('Exit date is required.');
      const ref = `TC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const { error } = await supabase.from('student_exit_records').insert({
        student_id: id,
        exit_type: 'transferred',
        exit_date: transferForm.exit_date,
        destination: transferForm.destination.trim() || null,
        reason: transferForm.reason.trim() || null,
        certificate_reference: ref,
      });
      if (error) throw error;
      return ref;
    },
    onSuccess: (ref) => {
      toast.success('Transfer certificate generated.');
      setCertificateRef(ref);
      setShowTransfer(false);
      setShowCertificate(true);
    },
    onError: (e) => toast.error(`Could not generate certificate: ${(e as Error).message}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Could not load student"
        description="Something went wrong fetching this student's record. Try again."
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (!data?.student) {
    return (
      <EmptyState
        title="Student not found"
        description="This student record does not exist or was removed."
        action={<ButtonLinkBack />}
      />
    );
  }

  const s = data.student as Record<string, string | null>;
  const fullName = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown Student';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const parent = data.parent;
  const schoolName = school?.name ?? 'School';

  const invoices = (data.invoices ?? []) as { id: string; amount_due?: number; amount_paid?: number; status?: string; due_date?: string }[];
  const totalDue = invoices.reduce((sum, i) => sum + (Number(i.amount_due) || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (Number(i.amount_paid) || 0), 0);
  const outstanding = totalDue - totalPaid;

  const payments = (data.payments ?? []) as { id: string; amount?: number; method?: string; status?: string; created_at?: string }[];
  const enrollments = (data.enrollments ?? []) as { id?: string; class_id?: string; status?: string; academic_year?: string; enrolled_at?: string }[];

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/students"
            className="inline-flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-primary/10 bg-primary/10 text-sm font-bold text-primary">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>#{s.admission_no ?? '—'}</span>
                {s.grade && <span>· {s.grade}</span>}
                {s.status && <StatusPill status={s.status} />}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowIdCard(true)}>
            <Printer className="size-3.5" />
            Print ID Card
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)}>
            <ArrowRightLeft className="size-3.5" />
            Transfer Certificate
          </Button>
        </div>
      </div>

      {showEdit && (
        <ConfirmDialog
          title="Edit Student"
          description={
            <span className="grid gap-3 pt-2">
              <span className="grid gap-3 sm:grid-cols-2">
                <Field label="First name" htmlFor="edit-first-name">
                  <Input id="edit-first-name" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                </Field>
                <Field label="Last name" htmlFor="edit-last-name">
                  <Input id="edit-last-name" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                </Field>
              </span>
              <Field label="Admission number" htmlFor="edit-admission-no">
                <Input id="edit-admission-no" value={editForm.admission_no} onChange={(e) => setEditForm({ ...editForm, admission_no: e.target.value })} />
              </Field>
              <span className="grid gap-3 sm:grid-cols-2">
                <Field label="Grade" htmlFor="edit-grade">
                  <Input id="edit-grade" value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })} />
                </Field>
                <Field label="Status" htmlFor="edit-status">
                  <select
                    id="edit-status"
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </span>
            </span>
          }
          confirmLabel="Save Changes"
          loading={editMutation.isPending}
          onConfirm={() => editMutation.mutate()}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showIdCard && (
        <ConfirmDialog
          title="Student ID Card"
          description={
            <span className="pt-2">
              <span className="print-receipt block rounded-xl border bg-card p-6 text-card-foreground">
                <span className="block text-center">
                  <span className="block text-lg font-bold">{schoolName}</span>
                  <span className="block text-xs text-muted-foreground">Student Identity Card</span>
                </span>
                <span className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">Name</span><span>{fullName}</span>
                  <span className="font-medium">Admission No</span><span>{s.admission_no ?? '—'}</span>
                  <span className="font-medium">Grade</span><span>{s.grade ?? '—'}</span>
                  <span className="font-medium">Status</span><span className="capitalize">{s.status ?? '—'}</span>
                </span>
              </span>
            </span>
          }
          confirmLabel="Print"
          cancelLabel="Close"
          onConfirm={() => window.print()}
          onClose={() => setShowIdCard(false)}
        />
      )}

      {showTransfer && (
        <ConfirmDialog
          title="Transfer Certificate"
          description={
            <span className="grid gap-3 pt-2">
              <Field label="Destination school" htmlFor="tc-destination">
                <Input
                  id="tc-destination"
                  placeholder="e.g. Baraka Secondary"
                  value={transferForm.destination}
                  onChange={(e) => setTransferForm({ ...transferForm, destination: e.target.value })}
                />
              </Field>
              <Field label="Reason" htmlFor="tc-reason">
                <Input
                  id="tc-reason"
                  placeholder="Reason for transfer"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                />
              </Field>
              <Field label="Exit date" htmlFor="tc-date">
                <Input
                  id="tc-date"
                  type="date"
                  value={transferForm.exit_date}
                  onChange={(e) => setTransferForm({ ...transferForm, exit_date: e.target.value })}
                />
              </Field>
            </span>
          }
          confirmLabel="Generate Certificate"
          loading={transferMutation.isPending}
          onConfirm={() => transferMutation.mutate()}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {showCertificate && (
        <ConfirmDialog
          title="Transfer Certificate"
          description={
            <span className="pt-2">
              <span className="print-receipt block rounded-xl border bg-card p-6 text-card-foreground">
                <span className="block text-center">
                  <span className="block text-lg font-bold">{schoolName}</span>
                  <span className="block text-xs text-muted-foreground">Transfer Certificate · {certificateRef}</span>
                </span>
                <span className="mt-4 block space-y-1 text-sm">
                  <span className="block">This certifies that <strong>{fullName}</strong> (Admission No: {s.admission_no ?? '—'}, Grade: {s.grade ?? '—'}) has been cleared for transfer{transferForm.destination ? <> to <strong>{transferForm.destination}</strong></> : null} effective {dateKE(transferForm.exit_date)}.</span>
                  {transferForm.reason && <span className="block text-muted-foreground">Reason: {transferForm.reason}</span>}
                </span>
                <span className="mt-8 flex justify-between">
                  <span className="border-t pt-1 text-xs text-muted-foreground">Authorised Signature</span>
                  <span className="border-t pt-1 text-xs text-muted-foreground">Date</span>
                </span>
              </span>
            </span>
          }
          confirmLabel="Print"
          cancelLabel="Close"
          onConfirm={() => window.print()}
          onClose={() => setShowCertificate(false)}
        />
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b print:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard title="Personal Information">
            <div className="grid gap-x-4 gap-y-1">
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow label="Admission Number" value={s.admission_no} />
              <InfoRow label="Grade" value={s.grade} />
              <InfoRow label="Status" value={s.status} />
            </div>
          </DetailCard>

          <DetailCard title="Parent / Guardian">
            {parent ? (
              <div className="grid gap-x-4 gap-y-1">
                <InfoRow label="Name" value={parent.full_name} />
                <InfoRow label="Phone" value={parent.phone} />
                <InfoRow label="Email" value={parent.email} />
                {parent.relationship && <InfoRow label="Relationship" value={parent.relationship} />}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No parent or guardian linked to this student.</p>
            )}
          </DetailCard>

          {enrollments.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Enrollment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={['Class', 'Academic Year', 'Status', 'Enrolled']}
                  rows={enrollments.map((e, i) => [
                    (e.class_id && classNames?.get(e.class_id)) || e.class_id || '—',
                    e.academic_year ?? '—',
                    e.status ? <StatusPill key={`enr-${e.id ?? i}`} status={e.status} /> : '—',
                    e.enrolled_at ? dateKE(e.enrolled_at) : '—',
                  ])}
                  pagination="none"
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <EmptyState
          title="Attendance records not available"
          description="Student attendance tracking is not enabled for this school yet."
        />
      )}

      {activeTab === 'fees' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Due</p>
                <p className="mt-1 text-2xl font-bold">KES {totalDue.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Paid</p>
                <p className="mt-1 text-2xl font-bold text-success">KES {totalPaid.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p>
                <p className={cn('mt-1 text-2xl font-bold', outstanding > 0 ? 'text-destructive' : 'text-success')}>
                  KES {outstanding.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No invoices found.</p>
              ) : (
                <DataTable
                  columns={['Amount Due', 'Amount Paid', 'Status', 'Due Date']}
                  rows={invoices.map((inv) => [
                    `KES ${Number(inv.amount_due ?? 0).toLocaleString()}`,
                    `KES ${Number(inv.amount_paid ?? 0).toLocaleString()}`,
                    inv.status ? <StatusPill key={`inv-${inv.id}`} status={inv.status} /> : '—',
                    inv.due_date ? dateKE(inv.due_date) : '—',
                  ])}
                  pagination="none"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No payments found.</p>
              ) : (
                <DataTable
                  columns={['Amount', 'Method', 'Status', 'Date']}
                  rows={payments.map((p) => [
                    `KES ${Number(p.amount ?? 0).toLocaleString()}`,
                    p.method ?? '—',
                    p.status ? <StatusPill key={`pay-${p.id}`} status={p.status} /> : '—',
                    p.created_at ? dateKE(p.created_at) : '—',
                  ])}
                  pagination="none"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'exams' && (
        <EmptyState
          title="Exam results not available"
          description="The examinations module has not been set up for this school yet."
        />
      )}

      {activeTab === 'documents' && (
        <EmptyState
          title="Documents not available"
          description="Student document storage has not been set up for this school yet."
        />
      )}

      {activeTab === 'activities' && (
        <EmptyState
          title="Activities not available"
          description="Student activity tracking has not been set up for this school yet."
        />
      )}

</div>
  );
}

function ButtonLinkBack() {
  return (
    <Link
      to="/admin/students"
      className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Back to Students
    </Link>
  );
}
