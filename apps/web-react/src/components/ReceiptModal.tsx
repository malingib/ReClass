import { Button, useDialogFocus, useEscape } from './ui';
import { datetimeKE, moneyKES } from '@/lib/format';

export type ReceiptView = {
  receipt_no?: string | null;
  amount?: number | null;
  created_at?: string | null;
  paid_at?: string | null;
  status?: string | null;
  payment_method?: string | null;
  student?: { first_name?: string | null; last_name?: string | null; admission_no?: string | null } | null;
  student_name?: string | null;
};

/** Official payment receipt — print-friendly, no internal field names. */
export function ReceiptModal({ receipt, schoolName = 'eShule', onClose }: { receipt: Record<string, unknown>; schoolName?: string; onClose: () => void }) {
  useEscape(onClose);
  const dialogRef = useDialogFocus();
  const r = receipt as unknown as ReceiptView;
  const student = r.student
    ? `${r.student.first_name ?? ''} ${r.student.last_name ?? ''}`.trim() || '—'
    : (r.student_name ?? '—');
  const admission = r.student?.admission_no ?? '—';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={onClose} role="presentation">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Payment receipt" className="print-receipt w-full max-w-md rounded-xl border bg-white p-6 text-slate-900 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-dashed border-slate-300 pb-4 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-lg bg-slate-900 font-bold text-white">E</div>
          <h2 className="mt-2 text-lg font-bold">{schoolName}</h2>
          <p className="text-xs text-slate-500">Official payment receipt</p>
        </div>
        <dl className="space-y-2 py-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Receipt no.</dt><dd className="font-mono font-semibold">{r.receipt_no ?? '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Student</dt><dd className="text-right font-medium">{student}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Admission no.</dt><dd className="font-mono">{admission}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Method</dt><dd>{r.payment_method ?? 'M-Pesa'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Date</dt><dd>{datetimeKE(r.paid_at ?? r.created_at)}</dd></div>
          <div className="flex justify-between gap-4 border-t border-dashed border-slate-300 pt-3 text-base"><dt className="font-semibold">Amount paid</dt><dd className="font-bold tabular-nums">{moneyKES(r.amount)}</dd></div>
        </dl>
        <p className="pb-1 text-center text-xs text-slate-500">Thank you. Keep this receipt for your records.</p>
        <div className="mt-4 flex gap-2 print:hidden">
          <Button onClick={() => window.print()} className="flex-1">Print</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
        </div>
      </div>
    </div>
  );
}
