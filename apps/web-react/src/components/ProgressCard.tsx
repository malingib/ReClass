import { cn } from '@/lib/utils';
import { Badge, Card, CardContent } from './ui';

/**
 * Progress card — welfare-connect CaseCard port, domain-agnostic.
 * Use for fee collection drives, remedial enrollment, payroll runs —
 * anywhere with actual vs expected + a progress bar.
 */
export function ProgressCard({
  title,
  badges,
  meta,
  amountLabel,
  amount,
  progress,
  actualLabel,
  expectedLabel,
  footer,
  onClick,
  className,
}: {
  title: string;
  badges?: { label: string; tone?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }[];
  meta?: { icon?: React.ComponentType<{ className?: string }>; text: string }[];
  amountLabel?: string;
  amount?: string;
  progress: number; // 0-100
  actualLabel?: string;
  expectedLabel?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <Card className={cn('hover-lift overflow-hidden', onClick && 'cursor-pointer', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-medium">{title}</h3>
              {badges?.map((b) => (
                <Badge key={b.label} variant={b.tone ?? 'outline'}>
                  {b.label}
                </Badge>
              ))}
            </div>
            {meta?.map((m, i) => (
              <div key={i} className="mt-2 flex items-center text-sm text-muted-foreground">
                {m.icon && <m.icon className="mr-1 size-4" />}
                <span className="truncate">{m.text}</span>
              </div>
            ))}
          </div>
          {(amountLabel || amount) && (
            <div className="flex-shrink-0 text-right">
              {amountLabel && <p className="text-xs text-muted-foreground">{amountLabel}</p>}
              {amount && <p className="font-semibold tabular-nums">{amount}</p>}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm">Collected</span>
            <span className="text-sm font-medium tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{actualLabel}</span>
            <span className="text-muted-foreground">{expectedLabel}</span>
          </div>
        </div>
      </CardContent>

      {footer && <div className="border-t bg-muted/40 px-4 py-3 sm:px-5">{footer}</div>}
      {onClick && !footer && (
        <button type="button" onClick={onClick} className="w-full border-t bg-muted/40 px-5 py-3 text-sm font-medium text-primary hover:bg-muted">
          View details
        </button>
      )}
    </Card>
  );
}
