import { useState } from 'react';
import { Button } from './ui';

/** Port of ReceiptModal.svelte — print-friendly receipt view. */
export function ReceiptModal({ receipt, onClose }: { receipt: Record<string, unknown>; onClose: () => void }) {
  const [print] = useState(false);
  void print;
  return (
    <div className="fixed inset-0 bg-black/40 p-8" onClick={onClose}>
      <div className="mx-auto max-w-md bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Receipt</h2>
        <dl className="mt-3 space-y-1 text-sm">
          {Object.entries(receipt).slice(0, 12).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="opacity-70">{k}</dt>
              <dd>{String(v ?? '—')}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => window.print()}>Print</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
