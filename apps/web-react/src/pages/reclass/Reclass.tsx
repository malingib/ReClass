import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck2, CheckCircle2, CircleDollarSign, Clock3, UsersRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAttendance, useRemedialDashboard } from '@/hooks/useRemedial';
import { useTenant } from '@/hooks/useTenant';
import { useInvoices, useReceipts } from '@/hooks/useFinance';
import { KpiCard } from '@/components/KpiCard';
import { DataTable } from '@/components/DataTable';
import { Button, ButtonLink, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, Field, LoadingButton, Textarea, useDisclosure } from '@/components/ui';
import { StatusPill, TableSkeleton } from '@/components/ui';
import { fullName } from '@/lib/format';
import { FeeManager } from '@/components/FeeManager';

const money = (value: unknown) => { const amount = Number(value ?? 0); return Number.isFinite(amount) ? `KES ${amount.toLocaleString()}` : '—'; };
const dateLabel = (value: unknown) => { if (!value) return '—'; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }); };
function PageHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">ReClass operations</p><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p></div>{action}</div>; }

export function ReclassDashboard() { const { data } = useRemedialDashboard(); const { data: pendingCount } = useQuery({ queryKey: ['attendance-pending-count'], queryFn: async () => { const { count } = await supabase.from('teacher_attendance').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending').is('deleted_at', null); return count ?? 0; } }); const sessions = data?.sessions ?? []; const attendance = data?.attendance ?? []; return <div className="space-y-6"><PageHeading title="ReClass dashboard" description="A live view of remedial enrolment, sessions and attendance." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Active enrollments" value={data?.activeEnrollments ?? '…'} icon={UsersRound} /><KpiCard label="Recent sessions" value={sessions.length} icon={CalendarCheck2} /><KpiCard label="Attendance rows" value={attendance.length} icon={CheckCircle2} /><KpiCard label="Awaiting approval" value={pendingCount ?? '…'} icon={Clock3} trend="Oldest first in the review queue" /></div><div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]"><Card><CardHeader><CardTitle>Recent sessions</CardTitle></CardHeader><CardContent className="p-0"><DataTable columns={['Session','Status','Scheduled']} rows={sessions.slice(0,8).map((s) => { const r = s as { id?: string; status?: string; scheduled_for?: string }; return [r.id ?? '—', <StatusPill key={r.id} status={r.status} />, dateLabel(r.scheduled_for)]; })} empty="No remedial sessions found." /></CardContent></Card><Card><CardHeader><CardTitle>Operational focus</CardTitle></CardHeader><CardContent className="space-y-3"><ButtonLink to="/admin/attendance/review"><div className="flex items-center gap-3 rounded-md border p-3 text-left"><div className="rounded-md bg-secondary p-2 text-secondary-foreground"><CalendarCheck2 className="size-4" /></div><div><p className="text-sm font-medium">Attendance review</p><p className="text-xs text-muted-foreground">{pendingCount ? `${pendingCount} awaiting approval` : 'Keep teacher attendance current.'}</p></div></div></ButtonLink><ButtonLink to="/admin/remedial-fees"><div className="flex items-center gap-3 rounded-md border p-3 text-left"><div className="rounded-md bg-accent p-2 text-accent-foreground"><CircleDollarSign className="size-4" /></div><div><p className="text-sm font-medium">Fee follow-up</p><p className="text-xs text-muted-foreground">Review unpaid remedial obligations.</p></div></div></ButtonLink></CardContent></Card></div></div>; }

export function Attendance() { const [page, setPage] = useState(1); const { data, isLoading, isError } = useAttendance(page, 50); return <div className="space-y-6"><PageHeading title="Remedial attendance" description="Record and review teacher attendance for remedial sessions." /><Card><CardHeader><CardTitle>Attendance register</CardTitle></CardHeader><CardContent className="p-0">{isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading attendance…</div> : isError ? <div className="p-6 text-sm text-destructive">Unable to load attendance.</div> : <DataTable columns={['Teacher','Marked','Review','Date']} rows={(data?.rows ?? []).map((r, ri) => { const t = (r.teachers ?? {}) as { first_name?: string; last_name?: string }; return [`${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || '—', r.status ?? '—', <StatusPill key={ri} status={(r as { approval_status?: string }).approval_status ?? 'pending'} />, dateLabel(r.marked_at)]; })} pagination="server" empty="No attendance records found." />}</CardContent></Card><div className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"><span className="text-muted-foreground">Page {page} · {data?.total ?? 0} records</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" disabled={(data?.rows?.length ?? 0) < 50} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div></div>; }

export function RemedialFees() { const [page, setPage] = useState(1); const pageSize = 20; const { data, isLoading } = useInvoices(page, pageSize); const rows = data?.rows ?? []; const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)); return <div className="space-y-6"><PageHeading title="Remedial fees" description="Manage remedial charges and monitor parent balances." /><FeeManager /><Card><CardHeader><CardTitle>Fee ledger</CardTitle></CardHeader><CardContent className="space-y-3">{isLoading ? <TableSkeleton /> : <><DataTable columns={['Student','Admission','Due','Paid','Status']} rows={rows.map((i) => [fullName(i.student?.first_name, i.student?.last_name), i.student?.admission_no ?? '—', money(i.amount_due), money(i.amount_paid), <StatusPill key={i.id} status={i.status} />])} empty="No remedial invoices found." pagination="server" />{pages > 1 && <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>}</>}</CardContent></Card></div>; }

export function ParentPayments() { const [page, setPage] = useState(1); const pageSize = 20; const { data, isLoading } = useReceipts(page, pageSize); const receipts = data?.rows ?? []; const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)); return <div className="space-y-6"><PageHeading title="Parent payments" description="Track receipts generated from remedial fee payments." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><KpiCard label="Receipts" value={data?.total ?? '…'} icon={CircleDollarSign} /><KpiCard label="Collected" value={money(receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0))} icon={CheckCircle2} /></div><Card><CardHeader><CardTitle>Payment receipts</CardTitle></CardHeader><CardContent className="space-y-3">{isLoading ? <TableSkeleton /> : <><DataTable columns={['Receipt','Student','Amount','Date','Status']} rows={receipts.map((r) => [r.receipt_no ?? '—', fullName(r.student?.first_name, r.student?.last_name), money(r.amount), dateLabel(r.created_at), <StatusPill key={r.id} status={r.status} />])} empty="No remedial payment receipts found." pagination="server" />{pages > 1 && <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>}</>}</CardContent></Card></div>; }

export function Committee() { const { data, isLoading, isError } = useAttendance(1, 50); return <div className="space-y-6"><PageHeading title="Remedial committee" description="Review attendance and prepare operational approvals. Authorization remains enforced server-side." /><Card><CardHeader><CardTitle>Attendance review</CardTitle></CardHeader><CardContent className="p-0">{isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading committee register…</div> : isError ? <div className="p-6 text-sm text-destructive">Unable to load the committee register.</div> : <DataTable columns={['Teacher','Marked','Review','Date']} rows={(data?.rows ?? []).map((r, ri) => { const t = (r.teachers ?? {}) as { first_name?: string; last_name?: string }; return [`${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || '—', r.status ?? '—', <StatusPill key={ri} status={(r as { approval_status?: string }).approval_status ?? 'pending'} />, dateLabel(r.marked_at)]; })} pagination="server" empty="No attendance requiring committee review." />}</CardContent></Card></div>; }

export { RemedialPayroll } from '@/pages/finance/Finance';

type PendingRow = {
  id: string;
  status: string;
  marked_at: string;
  marked_by: string | null;
  teachers?: { first_name?: string | null; last_name?: string | null } | null;
  occurrence?: { occurs_on?: string | null; class?: string | null } | null;
};

const REVIEW_ERRORS: Record<string, string> = {
  forbidden: 'You do not hold an approval right. Only the chair, principal or school admin can approve.',
  invalid_decision: 'Invalid decision. Choose approve or reject.',
  note_required: 'A note is required when rejecting — the teacher needs to know why.',
  maker_cannot_approve: 'You marked this attendance, so you cannot approve it. Another approver must review.',
};

/** Linear-inbox style approval queue: approve in one click, reject with a note. */
export function ReviewQueue() {
  const { data: ctx } = useTenant();
  const qc = useQueryClient();
  const [note, setNote] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<{ id: string; decision: 'approved' | 'rejected' } | null>(null);
  const confirm = useDisclosure();

  const pending = useQuery({
    queryKey: ['attendance-review-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('id,status,marked_at,marked_by,teachers(first_name,last_name),occurrence:session_occurrences(occurs_on,class)')
        .eq('approval_status', 'pending')
        .is('deleted_at', null)
        .order('marked_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as PendingRow[];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, decision, noteText }: { id: string; decision: 'approved' | 'rejected'; noteText: string }) => {
      const { data, error } = await supabase.rpc('review_teacher_attendance', {
        p_profile_id: ctx!.userId,
        p_attendance_id: id,
        p_decision: decision,
        p_note: noteText || null,
      });
      if (error) throw error;
      return (data ?? {}) as { status?: string };
    },
    onSuccess: (data, vars) => {
      const status = data?.status;
      if (status === vars.decision) {
        toast.success(vars.decision === 'approved' ? 'Attendance approved — it now counts toward payroll.' : 'Attendance rejected — the teacher can re-mark.');
        setNote((n) => ({ ...n, [vars.id]: '' }));
        void qc.invalidateQueries({ queryKey: ['attendance-review-queue'] });
        void qc.invalidateQueries({ queryKey: ['attendance'] });
      } else {
        toast.error(REVIEW_ERRORS[status ?? ''] ?? `Review failed (${status ?? 'unknown'}).`);
      }
      setConfirming(null);
      confirm.hide();
    },
    onError: (e) => {
      toast.error(`Review failed: ${(e as Error).message}`);
      setConfirming(null);
      confirm.hide();
    },
  });

  const rows = pending.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeading title="Attendance review queue" description="Oldest first. Approving turns attendance into payroll evidence; rejecting sends it back with your note." action={<span className="text-sm text-muted-foreground">{rows.length} pending</span>} />
      {pending.isLoading ? <TableSkeleton /> : pending.isError ? (
        <Card><CardContent className="p-6 text-sm text-destructive">Unable to load the review queue.</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Queue clear. Nothing awaiting approval.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const own = !!ctx?.userId && r.marked_by === ctx.userId;
            return (
              <Card key={r.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{fullName(r.teachers?.first_name, r.teachers?.last_name)}</p>
                      <p className="text-xs text-muted-foreground">
                        Marked {r.status} · {dateLabel(r.marked_at)}{r.occurrence?.occurs_on ? ` · Session ${dateLabel(r.occurrence.occurs_on)}` : ''}{r.occurrence?.class ? ` · ${r.occurrence.class}` : ''}
                      </p>
                    </div>
                    <StatusPill status="pending" />
                  </div>
                  {own && <p className="rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">You marked this session — separation of duties requires another approver.</p>}
                  <Field label="Review note (required to reject)">
                    <Textarea placeholder="Visible to the teacher on rejection…" value={note[r.id] ?? ''} onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))} rows={2} />
                  </Field>
                  <div className="flex gap-2">
                    <LoadingButton loading={review.isPending} disabled={own} title={own ? 'You cannot approve your own marking' : 'Approve'} onClick={() => { setConfirming({ id: r.id, decision: 'approved' }); confirm.show(); }}>Approve</LoadingButton>
                    <Button variant="outline" disabled={own || review.isPending} onClick={() => { setConfirming({ id: r.id, decision: 'rejected' }); confirm.show(); }}>Reject</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {confirm.open && confirming && (
        <ConfirmDialog
          title={confirming.decision === 'approved' ? 'Approve attendance?' : 'Reject attendance?'}
          description={confirming.decision === 'approved'
            ? 'This record becomes payroll evidence. Continue?'
            : (note[confirming.id] ?? '').trim() ? `The teacher will see: “${(note[confirming.id] ?? '').trim()}”` : 'A note is required to reject.'}
          confirmLabel={confirming.decision === 'approved' ? 'Approve' : 'Reject with note'}
          loading={review.isPending}
          onConfirm={() => {
            const text = (note[confirming.id] ?? '').trim();
            if (confirming.decision === 'rejected' && !text) {
              toast.error('Write a rejection note first.');
              return;
            }
            review.mutate({ id: confirming.id, decision: confirming.decision, noteText: text });
          }}
          onClose={() => { setConfirming(null); confirm.hide(); }}
        />
      )}
    </div>
  );
}
