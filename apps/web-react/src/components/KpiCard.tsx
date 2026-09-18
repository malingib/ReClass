import { cn } from '@/lib/utils';
import { Card, CardContent, Skeleton } from './ui';

type Trend = { value: number; isPositive: boolean };

/**
 * KPI / stats card — welfare-connect StatsCard port.
 * Backward compatible: `label`/`trend?: string` still work.
 * New: `trendValue` pill + sparkline + `isLoading` skeleton.
 */
export function KpiCard({
  label,
  title,
  value,
  icon: Icon,
  trend,
  description,
  trendValue,
  className,
  isLoading,
}: {
  label?: string;
  title?: string;
  value?: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string | Trend;
  description?: string;
  trendValue?: Trend;
  className?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card className={cn('border-none shadow-sm', className)}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="mt-4 h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  const heading = title ?? label ?? '';
  const trendObj: Trend | undefined =
    typeof trend === 'object' ? trend : trendValue;
  const trendText = typeof trend === 'string' ? trend : undefined;

  return (
    <Card className={cn('group border-none shadow-sm transition-all duration-300 hover:shadow-md', className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium leading-tight text-muted-foreground sm:text-sm">{heading}</p>
            <div className="text-lg font-bold leading-tight tracking-tight tabular-nums sm:text-2xl">{value}</div>
          </div>
          {Icon && (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-primary shadow-sm transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground sm:h-10 sm:w-10">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
        </div>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            {trendObj && (
              <div className="mb-1 flex flex-wrap items-center">
                <span
                  className={cn(
                    'mr-1 flex flex-shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold',
                    trendObj.isPositive ? 'bg-success/15 text-success-foreground' : 'bg-destructive/10 text-destructive',
                  )}
                >
                  {trendObj.isPositive ? '↑' : '↓'} {trendObj.value}%
                </span>
                <span className="whitespace-nowrap text-[10px] font-medium text-muted-foreground sm:text-[11px]">Last week</span>
              </div>
            )}
            {(description ?? trendText) && !trendObj && (
              <p className="break-words text-[10px] font-medium text-muted-foreground sm:text-[11px]">{description ?? trendText}</p>
            )}
          </div>

          {trendObj && (
            <div className="hidden h-6 w-12 flex-shrink-0 opacity-60 sm:block sm:h-8 sm:w-16" aria-hidden>
              <svg viewBox="0 0 100 40" className="h-full w-full overflow-visible">
                <path
                  d={
                    trendObj.isPositive
                      ? 'M0,35 C20,30 30,15 50,20 S80,5 100,10'
                      : 'M0,10 C20,15 30,30 50,25 S80,35 100,30'
                  }
                  fill="none"
                  stroke={trendObj.isPositive ? 'var(--success)' : 'var(--destructive)'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
