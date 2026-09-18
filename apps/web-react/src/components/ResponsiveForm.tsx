import { cn } from '@/lib/utils';

/**
 * Responsive form primitives — welfare-connect ResponsiveForm port.
 * Single/dual/triple column grids that collapse to 1 col on mobile.
 */
export function ResponsiveForm({
  children,
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement> & { children: React.ReactNode }) {
  return (
    <form className={cn('space-y-4 sm:space-y-6', className)} {...props}>
      {children}
    </form>
  );
}

export function ResponsiveFormGroup({
  children,
  columns = 'dual',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  columns?: 'single' | 'dual' | 'triple';
}) {
  const gridClass =
    columns === 'single'
      ? 'grid-cols-1'
      : columns === 'triple'
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2';
  return (
    <div className={cn(`grid ${gridClass} gap-3 sm:gap-4 md:gap-6`, className)} {...props}>
      {children}
    </div>
  );
}

export function ResponsiveFormField({
  label,
  required,
  error,
  hint,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {label && (
        <span className="block text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </div>
  );
}
