import { usePayrollOp, usePayrollRuns } from '@/hooks/useFinance';
import { Button, Input } from './ui';
import { DataTable } from './DataTable';
import { useState } from 'react';

/** Port of PayrollComponentsPanel.svelte — transitions via payroll-ops Edge. */
export function PayrollPanel({ kind }: { kind: 'school' | 'remedial' }) {
  const { data: runs = [], isLoading } = usePayrollRuns(kind);
  const op = usePayrollOp(kind);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [msg, setMsg] = useState('');

  async function run(body: Parameters<typeof op.mutateAsync>[0]) {
    setMsg('');
    try {
      const res = await op.mutateAsync(body);
      setMsg(JSON.stringify(res));
    } catch (e) {
      setMsg(`Failed: ${(e as Error).message}`);
    }
  }

  const paid = runs.filter((r) => r.status === 'paid').length;

  return (
    <div className="space-y-4">
      <p className="text-sm">Runs: {runs.length} · Paid: {paid} · Pending: {runs.length - paid}</p>
      <div className="flex flex-wrap gap-2">
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="!w-auto" />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="!w-auto" />
        <Button onClick={() => run({ op: 'generate', period_start: start, period_end: end })}>Generate</Button>
      </div>
      {isLoading ? (
        <p className="text-sm opacity-70">Loading…</p>
      ) : (
        <DataTable
          columns={['Period', 'Amount', 'Status', 'Approve', 'Mark paid']}
          rows={runs.map((r) => {
            const row = r as { id: string; period_start?: string; amount?: number; status?: string };
            return [
              row.period_start,
              row.amount,
              row.status,
              <Button key="a" onClick={() => run({ op: 'approve', id: row.id })}>Approve</Button>,
              <Button key="p" onClick={() => run({ op: 'mark-paid', id: row.id })}>Mark paid</Button>,
            ];
          })}
        />
      )}
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
