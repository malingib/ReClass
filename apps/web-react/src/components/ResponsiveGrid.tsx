import { cn } from '@/lib/utils';

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const gapMap = {
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

/**
 * Mobile-first grid — ported from welfare-connect.
 * Defaults: 1 col on mobile, 2 on sm/md, 3-4 on lg/xl.
 */
export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className,
  ...props
}: ResponsiveGridProps) {
  let gridColsClass = 'grid-cols-1';
  if (cols.sm === 2) gridColsClass += ' sm:grid-cols-2';
  if (cols.md === 3) gridColsClass += ' md:grid-cols-3';
  else if (cols.md === 2) gridColsClass += ' md:grid-cols-2';
  if (cols.lg === 4) gridColsClass += ' lg:grid-cols-4';
  else if (cols.lg === 3) gridColsClass += ' lg:grid-cols-3';
  if (cols.xl === 5) gridColsClass += ' xl:grid-cols-5';
  else if (cols.xl === 4) gridColsClass += ' xl:grid-cols-4';

  return (
    <div className={cn('grid', gridColsClass, gapMap[gap], className)} {...props}>
      {children}
    </div>
  );
}
