import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, LogOut, PanelLeft, Moon, Sun, Bell, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navGroups, filterNavByRole } from './nav-data';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/lib/rbac';
import { useTheme } from '@/context/theme-provider';
import { NotificationBell } from '@/components/NotificationBell';

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { data: ctx } = useTenant();
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Operations: true, ReClass: true });
  const filtered = filterNavByRole(navGroups, ctx?.activeRole);

  return (
    <aside className={cn('flex flex-col border-r bg-sidebar transition-[width] duration-200', collapsed ? 'w-[3.5rem]' : 'w-64')}>
      <div className="flex h-16 items-center gap-2 border-b px-3">
        <div className={cn('flex min-w-0 items-center gap-2', collapsed && 'w-full justify-center')}>
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">E</div>
          {!collapsed && <span className="truncate font-semibold tracking-tight">eShule</span>}
        </div>
        <button onClick={onToggle} className="ml-auto rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <PanelLeft className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</div>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const hasChildren = !!item.items?.length;
                const isActive = item.url ? pathname === item.url || pathname.startsWith(item.url + '/') : false;
                if (hasChildren) {
                  const isOpen = openGroups[item.title] ?? false;
                  return (
                    <li key={item.title}>
                      <button onClick={() => setOpenGroups((s) => ({ ...s, [item.title]: !isOpen }))} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed && 'justify-center')}>
                        {item.icon && <item.icon className="size-4 shrink-0" />}
                        {!collapsed && <span className="flex-1 text-left">{item.title}</span>}
                        {!collapsed && <ChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')} />}
                      </button>
                      {isOpen && !collapsed && (
                        <ul className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-2">
                          {item.items!.map((child) => {
                            const childActive = child.url ? pathname === child.url || pathname.startsWith(child.url + '/') : false;
                            return (
                              <li key={child.title}>
                                <Link to={child.url!} className={cn('block rounded-md border-l-2 border-transparent px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', childActive && 'border-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground')}>
                                  {child.title}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                }
                return (
                  <li key={item.title}>
                    <Link to={item.url!} className={cn('flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground', collapsed && 'justify-center')} title={collapsed ? item.title : undefined}>
                      {item.icon && <item.icon className="size-4 shrink-0" />}
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-sidebar-border p-2">
        {!collapsed && ctx && ctx.activeRole && (
          <div className="mb-2 rounded-md border border-sidebar-border bg-sidebar-accent/60 p-2 text-xs">
            <div className="font-medium text-sidebar-accent-foreground">{roleLabels[ctx.activeRole]}</div>
            <div className="truncate text-muted-foreground">Single-school deployment</div>
          </div>
        )}
        <SidebarFooter collapsed={collapsed} />
      </div>
    </aside>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { logout, switchRole } = useAuth();
  const { data: ctx } = useTenant();
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn('flex items-center gap-1', collapsed && 'justify-center')}>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" title="Theme">
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
      <Link to="/notifications" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" title="Notifications">
        <Bell className="size-4" />
      </Link>
      {ctx && ctx.roles.length > 1 && !collapsed && (
        <select value={ctx.activeRole ?? ''} onChange={(e) => switchRole(e.target.value as never, ctx.roles)} className="min-w-0 flex-1 rounded-md border border-sidebar-border bg-sidebar px-1.5 py-1 text-xs text-sidebar-foreground">
          {ctx.roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
        </select>
      )}
      <button onClick={logout} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title="Logout">
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

export function Header({ onToggleSidebar, title, onSearch }: { onToggleSidebar: () => void; title?: string; onSearch?: () => void }) {
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur-sm transition-all duration-200 sm:px-6 md:h-16 md:px-8">
      <button onClick={onToggleSidebar} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden" aria-label="Open navigation">
        <PanelLeft className="size-4" />
      </button>
      {title && <p className="truncate text-sm font-semibold tracking-tight" aria-hidden="true">{title}</p>}
      {/* Welfare-connect style search — opens the command palette */}
      <div className="ml-4 hidden max-w-md flex-1 md:block">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-md border border-transparent bg-muted px-3 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground md:h-10"
          aria-label="Search (Ctrl+K)"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium lg:inline-block">Ctrl K</kbd>
        </button>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button onClick={onSearch} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden" aria-label="Search">
          <Search className="size-4" />
        </button>
        <NotificationBell />
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </header>
  );
}
