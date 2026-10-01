import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export function useEscape(onEscape: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape]);
}

/**
 * Dialog focus management: moves focus into the dialog on open, traps Tab
 * inside it, and restores focus to the previously focused element on close.
 */
export function useDialogFocus<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );
    (focusables()[0] ?? node).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);
  return ref;
}

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2', sm: 'h-9 rounded-md px-3 text-xs', lg: 'h-10 rounded-md px-8', icon: 'h-9 w-9',
      },
    }, defaultVariants: { variant: 'default', size: 'default' },
  }
);

export function Button({ className = '', variant, size, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...rest} />;
}
/** Button-styled react-router link. */
export function ButtonLink({ to, className = '', variant, size, children }: { to: string; className?: string; children: ReactNode } & VariantProps<typeof buttonVariants>) {
  return <Link to={to} className={cn(buttonVariants({ variant, size }), className)}>{children}</Link>;
}
export function LoadingButton({ loading, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean } & VariantProps<typeof buttonVariants>) {
  return <Button disabled={loading || rest.disabled} {...rest}>{loading ? 'Please wait…' : children}</Button>;
}
export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)}>{children}</div>;
}
export function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) { return <div className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)}>{children}</div>; }
export function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) { return <h3 className={cn('text-sm font-semibold leading-none tracking-tight', className)}>{children}</h3>; }
export function CardDescription({ className = '', children }: { className?: string; children: React.ReactNode }) { return <div className={cn('text-xs text-muted-foreground', className)}>{children}</div>; }
export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) { return <div className={cn('p-5 pt-0', className)}>{children}</div>; }
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input className={cn('flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', props.className)} {...props} />; }
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={cn('flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', props.className)} {...props} />; }
export function Badge({ children, className = '', variant }: { children: React.ReactNode; className?: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }) {
  const tones: Record<string, string> = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    destructive: 'border-transparent bg-destructive text-destructive-foreground',
    outline: 'text-foreground',
    success: 'border-success/30 bg-success/15 text-success-foreground',
    warning: 'border-warning/30 bg-warning/15 text-warning-foreground',
  };
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', tones[variant ?? 'outline'], className)}>{children}</span>;
}
export function Skeleton({ className = '' }: { className?: string }) { return <div className={cn('animate-pulse rounded-md bg-muted', className)} />; }

/** Skeleton list — welfare-connect port for card/row loading states. */
export function SkeletonList({ count = 5, className = '', variant = 'card' }: { count?: number; className?: string; variant?: 'card' | 'row' }) {
  if (variant === 'row') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full sm:h-12 sm:w-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40 sm:h-5" />
              <Skeleton className="h-3 w-24 sm:h-4" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  success: 'paid completed approved active sent delivered success reconciled',
  warning: 'pending queued partial submitted initiated in_progress open draft scheduled',
  danger: 'failed rejected overdue cancelled void unmatched error',
  info: 'info sms inapp email',
};

export function statusTone(status: unknown): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const s = String(status ?? '').toLowerCase();
  for (const [tone, words] of Object.entries(STATUS_TONES)) {
    // Word boundaries: 'unpaid' must not match the 'paid' keyword.
    if (words.split(' ').some((w) => new RegExp(`\\b${w}\\b`).test(s))) return tone as 'success' | 'warning' | 'danger' | 'info';
  }
  return 'neutral';
}

const PILL_STYLES: Record<string, string> = {
  success: 'border-success/30 bg-success/15 text-success-foreground',
  warning: 'border-warning/30 bg-warning/15 text-warning-foreground',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-info/30 bg-info/15 text-info-foreground',
  neutral: 'border-border bg-muted text-muted-foreground',
};

/** Colored status pill — Stripe-style state language for money/queue rows. */
export function StatusPill({ status, className = '' }: { status: unknown; className?: string }) {
  const tone = statusTone(status);
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize', PILL_STYLES[tone], className)}><span className="size-1.5 rounded-full bg-current" aria-hidden />{String(status ?? '—')}</span>;
}

/** Accessible modal dialog with focus on open and Escape to close. */
export function ConfirmDialog({ title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', loading, tone = 'default', onConfirm, onClose }: {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: 'default' | 'destructive';
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  const dialogRef = useDialogFocus();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <LoadingButton loading={loading} variant={tone === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</LoadingButton>
        </div>
      </div>
    </div>
  );
}

/** Labeled form field — shadcn Field pattern. */
export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <label className="block space-y-1.5 text-sm" htmlFor={htmlFor}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

/** Consistent page heading — eyebrow + title + description + optional action. */
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Empty state with action — replaces bare "No records" text on key pages. */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Table skeleton for queue/register loading states. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
    </div>
  );
}

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}

/** Page container — single operational width + rhythm for all pages. */
export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] space-y-6', className)}>{children}</div>;
}

/** Breadcrumbs — Home / Section / Page. Rendered by the shell from the route. */
export function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  if (trail.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">/</span>}
            {crumb.to && i < trail.length - 1 ? (
              <Link to={crumb.to} className="rounded hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current={i === trail.length - 1 ? 'page' : undefined} className={i === trail.length - 1 ? 'font-medium text-foreground' : undefined}>
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Search input with leading icon — standard filter-bar search. */
export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative flex-1">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
      </span>
      <Input className={cn('pl-9', props.className)} {...props} />
    </div>
  );
}

/** Filter bar — horizontal wrap for search + selects + clear. */
export function FilterBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>{children}</div>;
}

/** Loading state — skeleton + status text for data-heavy surfaces. */
export function LoadingState({ title = 'Loading…', rows = 5 }: { title?: string; rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label={title}>
      <span className="sr-only">{title}</span>
      <TableSkeleton rows={rows} />
    </div>
  );
}

/** Error state — recovery message without provider/DB detail. */
export function ErrorState({ title, description, onRetry }: { title: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center" role="alert">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {onRetry && <div className="mt-4 flex justify-center"><Button variant="outline" onClick={onRetry}>Try again</Button></div>}
    </div>
  );
}

/** Section header — H2 + optional description + optional action. */
export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Stat — single KPI for dashboards (label/value/description + icon). */
export function Stat({ label, value, description, icon }: { label: string; value: ReactNode; description?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Pagination — server-driven prev/next pager. */
export function Pagination({ page, totalPages, total, label = 'rows', onPrev, onNext }: { page: number; totalPages: number; total: number; label?: string; onPrev: () => void; onNext: () => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Page {page} of {totalPages} · {total.toLocaleString()} {label}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}

/** User avatar — initials with accessible label. */
export function UserAvatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name.trim().split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <span aria-label={name} role="img" className={cn('grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary', className)}>
      {initials}
    </span>
  );
}

/** Tabs — accessible tab list with keyboard arrow support. */
export function Tabs({ tabs, value, onChange }: { tabs: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.value === value);
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(idx + dir + tabs.length) % tabs.length];
    if (next) {
      onChange(next.value);
      const el = document.querySelector<HTMLElement>(`[role="tab"][data-value="${next.value}"]`);
      el?.focus();
    }
  }
  return (
    <div role="tablist" aria-label="Sections" onKeyDown={onKeyDown} className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          data-value={t.value}
          aria-selected={value === t.value}
          tabIndex={value === t.value ? 0 : -1}
          onClick={() => onChange(t.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
