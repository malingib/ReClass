import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Reports sub-navigation — welfare-connect ReportsSubnav port.
 * Generic items so each school area (finance / principal / reclass)
 * can pass its own tabs.
 */
export function ReportsSubnav({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  const { pathname } = useLocation();
  const isActive = (href: string) =>
    pathname === href || (href !== items[0]?.href && pathname.startsWith(href));

  return (
    <div className="rounded-xl border bg-card p-1">
      <nav className={cn('grid gap-1', items.length <= 1 ? 'grid-cols-1' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors',
              isActive(item.href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
