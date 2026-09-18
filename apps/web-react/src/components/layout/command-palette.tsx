import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { filterNavByRole, navGroups } from './nav-data';
import { useTenant } from '@/hooks/useTenant';
import { roleHome } from '@/lib/rbac';
import { useEscape } from '@/components/ui';

/** Keyboard-first navigation: Ctrl/⌘K, arrows, Enter. Scoped to the active role. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const { data: ctx } = useTenant();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  useEscape(onClose);

  const items = useMemo(() => {
    const out: { title: string; hint: string; to: string }[] = [];
    for (const g of filterNavByRole(navGroups, ctx?.activeRole)) {
      for (const item of g.items) {
        if (item.url) out.push({ title: item.title, hint: g.title, to: item.url });
        for (const child of item.items ?? []) {
          if (child.url) out.push({ title: `${item.title} · ${child.title}`, hint: g.title, to: child.url });
        }
      }
    }
    if (ctx?.activeRole && roleHome[ctx.activeRole]) out.unshift({ title: 'Home', hint: 'Start', to: roleHome[ctx.activeRole] });
    const q = query.trim().toLowerCase();
    return q ? out.filter((i) => `${i.title} ${i.hint}`.toLowerCase().includes(q)) : out;
  }, [ctx?.activeRole, query]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => { if (open) setQuery(''); }, [open ]);

  function go(to: string) {
    onClose();
    nav(to);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 pt-[15vh]" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Go to page" className="mx-auto w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && items[index]) go(items[index].to);
            }}
            placeholder="Go to… (pages for your role)"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {items.length === 0 && <li className="p-4 text-sm text-muted-foreground">No pages match.</li>}
          {items.slice(0, 12).map((item, i) => (
            <li key={item.to + item.title}>
              <Link
                to={item.to}
                onClick={(e) => { e.preventDefault(); go(item.to); }}
                onMouseEnter={() => setIndex(i)}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${i === index ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <span>{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">↑↓ to move · Enter to open · Esc to close</p>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return { open, setOpen };
}
