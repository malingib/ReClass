import { usePayrollOp, usePayrollRuns } from '@/hooks/useFinance';
import { DataTable } from './DataTable';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, ConfirmDialog, Field, Input, LoadingButton, StatusPill, TableSkeleton, useDisclosure } from './ui';
import { dateKE, moneyKES } from '@/lib/format';

type PayrollAction = { op: 'generate' | 'approve' | 'mark-paid'; period_start?: string; period_end?: string; id?: string };

const ACTION_COPY: Record<PayrollAction['op'], { title: string; confirm: string; describe: (a: PayrollAction) => string }> = {
  generate: {
    title: 'Generate payroll run',
    confirm: 'Generate run',
    describe: (a) => `Create a draft payroll run for ${dateKE(a.period_start)} – ${dateKE(a.period_end)} from approved attendance only. Unapproved sessions are excluded.`,
  },
  approve: {
    title: 'Approve payroll run',
    confirm: 'Approve run',
    describe: () => 'Approve this run for payout. Approval is recorded with your identity and cannot be undone — a correction run is required instead.',
  },
  'mark-paid': {
    title: 'Mark run as paid',
    confirm: 'Mark paid',
    describe: () => 'Confirm the money has left the school account. This closes the run and notifies teachers.',
  },
};

function summarizeResult(res: unknown): string {
  if (res == null) return 'Done.';
  if (typeof res === 'string') return res;
  const r = res as Record<string, unknown>;
  for (const key of ['message', 'status', 'result', 'summary']) {
    if (typeof r[key] === 'string' && r[key]) return r[key] as string;
  }
  if (typeof r.count === 'number') return `${r.count} line${r.count === 1 ? '' : 's'} processed.`;
  if (typeof r.run_id === 'string') return `Run ${r.run_id.slice(0, 8)}… ready.`;
  return 'Done — see the updated run list below.';
}

/** Payroll runs with guarded transitions: every money action confirms first. */
export function PayrollPanel({ kind }: { kind: 'school' | 'remedial' }) {
  const { data: runs = [], isLoading } = usePayrollRuns(kind);
  const op = usePayrollOp(kind);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [pending, setPending] = useState<PayrollAction | null>(null);
  const confirm = useDisclosure();

  async function run(body: PayrollAction) {
    try {
      const res = await op.mutateAsync(body);
      toast.success(summarizeResult(res));
    } catch (e) {
      toast.error(`Payroll action failed: ${(e as Error).message}`);
    } finally {
      setPending(null);
      confirm.hide();
    }
  }

  function ask(body: PayrollAction) {
    setPending(body);
    confirm.show();
  }

  const paid = runs.filter((r) => r.status === 'paid').length;
  const copy = pending ? ACTION_COPY[pending.op] : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Runs: {runs.length} · Paid: {paid} · Pending: {runs.length - paid}. Preparation and approval are separated — the account that generates a run should not approve it.</p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Period start"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="!w-auto" /></Field>
        <Field label="Period end"><Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="!w-auto" /></Field>
        <LoadingButton loading={op.isPending} disabled={!start || !end} onClick={() => ask({ op: 'generate', period_start: start, period_end: end })}>Generate</LoadingButton>
      </div>
      {isLoading ? <TableSkeleton /> : (
        <DataTable
          columns={['Period', 'Amount', 'Status', 'Approve', 'Mark paid']}
          rows={runs.map((r) => {
            const row = r as unknown as { id: string; period_start?: string; period_end?: string; amount?: number; status?: string };
            const period = row.period_end && row.period_end !== row.period_start ? `${dateKE(row.period_start)} – ${dateKE(row.period_end)}` : dateKE(row.period_start);
            const approved = row.status === 'approved';
            const paid = row.status === 'paid';
            return [
              period,
              moneyKES(row.amount),
              <StatusPill key={`s-${row.id}`} status={row.status} />,
              <Button key={`a-${row.id}`} variant="outline" size="sm" disabled={approved || paid || op.isPending} title={approved || paid ? 'Already approved' : 'Approve this run for payout'} onClick={() => ask({ op: 'approve', id: row.id })}>Approve</Button>,
              <Button key={`p-${row.id}`} variant="outline" size="sm" disabled={!approved || op.isPending} title={!approved ? 'Approve the run first' : 'Confirm payout completed'} onClick={() => ask({ op: 'mark-paid', id: row.id })}>Mark paid</Button>,
            ];
          })}
          empty="No payroll runs yet. Generate the first run for a period above."
        />
      )}
      {confirm.open && pending && copy && (
        <ConfirmDialog
          title={copy.title}
          description={<span>{copy.describe(pending)}</span>}
          confirmLabel={copy.confirm}
          loading={op.isPending}
          onConfirm={() => run(pending)}
          onClose={() => { setPending(null); confirm.hide(); }}
        />
      )}
    </div>
  );
}
