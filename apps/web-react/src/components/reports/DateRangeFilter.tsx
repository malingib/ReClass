import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ReportDateRange } from './types';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() - months);
  return d;
}

/**
 * Date range filter — welfare-connect DateRangeFilter port without
 * the radix popover/calendar dependency: preset pills + native date inputs.
 */
export function DateRangeFilter({
  onApply,
  initialStart,
  initialEnd,
  className,
}: {
  onApply: (range: ReportDateRange) => void;
  initialStart?: Date;
  initialEnd?: Date;
  className?: string;
}) {
  const [preset, setPreset] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  const [start, setStart] = useState(() => toISODate(initialStart ?? shiftMonths(new Date(), 1)));
  const [end, setEnd] = useState(() => toISODate(initialEnd ?? new Date()));

  const applyPreset = (p: 'month' | 'quarter' | 'year') => {
    const e = new Date();
    const s = p === 'month' ? shiftMonths(e, 1) : p === 'quarter' ? shiftMonths(e, 3) : shiftMonths(e, 12);
    setPreset(p);
    setStart(toISODate(s));
    setEnd(toISODate(e));
    onApply({ startDate: s, endDate: e, preset: p });
  };

  const applyCustom = () => {
    setPreset('custom');
    onApply({ startDate: new Date(`${start}T00:00:00`), endDate: new Date(`${end}T23:59:59`), preset: 'custom' });
  };

  const pills: { key: 'month' | 'quarter' | 'year'; label: string }[] = [
    { key: 'month', label: 'Last month' },
    { key: 'quarter', label: 'Last quarter' },
    { key: 'year', label: 'Last year' },
  ];

  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-end sm:p-4', className)}>
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <Button key={p.key} variant={preset === p.key ? 'default' : 'outline'} size="sm" onClick={() => applyPreset(p.key)}>
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1 text-xs font-medium text-muted-foreground">
          From
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            <Input type="date" value={start} onChange={(e) => { setStart(e.target.value); setPreset('custom'); }} aria-label="Start date" />
          </span>
        </label>
        <label className="flex-1 space-y-1 text-xs font-medium text-muted-foreground">
          To
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            <Input type="date" value={end} onChange={(e) => { setEnd(e.target.value); setPreset('custom'); }} aria-label="End date" />
          </span>
        </label>
        <Button variant="outline" size="sm" onClick={applyCustom} className="sm:mb-[1px]">
          Apply
        </Button>
      </div>
    </div>
  );
}
