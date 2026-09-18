import { useCallback, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Receipt, RefreshCw, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { datetimeKE, moneyKES } from '@/lib/format';
import { Button, Skeleton, StatusPill, useDialogFocus, useEscape } from './ui';

export type PaymentItem = {
  id: string;
  title: string;
  description?: string;
  amount: number;
  direction?: 'in' | 'out';
  kind?: 'fee' | 'payroll' | 'refund' | 'transfer' | 'other';
  date: string | Date;
  reference?: string;
  status?: string;
  actor?: string;
};

function PaymentIcon({ item }: { item: PaymentItem }) {
  const cls = 'size-4';
  if (item.kind === 'payroll') return <Wallet className={cn(cls, 'text-emerald-500')} />;
  if (item.kind === 'refund') return <RefreshCw className={cn(cls, 'text-purple-500')} />;
  if (item.kind === 'fee') return <Receipt className={cn(cls, 'text-blue-500')} />;
  if (item.direction === 'out') return <ArrowDownLeft className={cn(cls, 'text-red-500')} />;
  if (item.direction === 'in') return <ArrowUpRight className={cn(cls, 'text-green-500')} />;
  return <CreditCard className={cn(cls, 'text-muted-foreground')} />;
}

/**
 * Payment list — welfare-connect TransactionList port.
 * Icon + title/description on the left, amount + date/ref on the right,
 * detail modal on click, skeleton loading state.
 */
export function PaymentList({
  items,
  loading,
  empty = 'No payments found.',
  renderAction,
}: {
  items: PaymentItem[];
  loading?: boolean;
  empty?: string;
  renderAction?: (item: PaymentItem) => React.ReactNode;
}) {
  const [selected, setSelected] = useState<PaymentItem | null>(null);
  const open = useCallback((item: PaymentItem) => setSelected(item), []);
  const close = useCallback(() => setSelected(null), []);

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div>
                  <Skeleton className="mb-2 h-5 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="mb-2 h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center sm:p-10">
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {items.map((item) => {
        const negative = item.direction === 'out' || item.amount < 0;
        return (
          <div
            key={item.id}
            className="hover-lift flex items-center justify-between gap-2 rounded-xl border bg-card p-3 shadow-sm sm:p-5"
          >
            <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 sm:gap-5" onClick={() => open(item)} role="button" tabIndex={0}>
              <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary shadow-sm sm:h-12 sm:w-12">
                <PaymentIcon item={item} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold sm:text-base">{item.title}</p>
                {item.description && <p className="mb-1 truncate text-xs text-muted-foreground sm:text-sm">{item.description}</p>}
                {item.actor && (
                  <p className="truncate text-xs italic text-muted-foreground">
                    From: <span className="font-medium not-italic text-foreground">{item.actor}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="ml-2 flex h-full min-w-[70px] flex-shrink-0 flex-col items-end sm:min-w-[140px]">
              <p className={cn('text-sm font-bold tracking-tight tabular-nums sm:text-lg', negative ? 'text-destructive' : 'text-success-foreground')}>
                {negative ? '−' : '+'}
                {moneyKES(Math.abs(item.amount)).replace('KES ', 'KES ')}
              </p>
              <div className="mt-2 flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted-foreground">{datetimeKE(item.date)}</span>
                {item.reference && (
                  <span className="mt-0.5 rounded bg-info/15 px-2 py-0.5 text-xs text-info-foreground">Ref: {item.reference}</span>
                )}
              </div>
            </div>
            {renderAction && <div className="ml-4 flex-shrink-0">{renderAction(item)}</div>}
          </div>
        );
      })}

      {selected && (
        <PaymentDetailModal item={selected} onClose={close} />
      )}
    </div>
  );
}

function PaymentDetailModal({ item, onClose }: { item: PaymentItem; onClose: () => void }) {
  useEscape(onClose);
  const dialogRef = useDialogFocus();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={item.title} className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold">{item.title}</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold tabular-nums">{moneyKES(item.amount)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Date</span>
            <span>{datetimeKE(item.date)}</span>
          </div>
          {item.reference && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{item.reference}</span>
            </div>
          )}
          {item.status && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <StatusPill status={item.status} />
            </div>
          )}
          {item.description && <p className="pt-1 text-muted-foreground">{item.description}</p>}
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
