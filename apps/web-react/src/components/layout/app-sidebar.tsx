import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronsUpDown,
  LogIn,
  Search,
  Menu,
  Plus,
  User,
  Settings,
  HelpCircle,
  CreditCard,
  Languages,
  CalendarDays,
  GraduationCap,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { navGroups, filterNavByRole, type NavGroup, type NavItem } from './nav-data';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { roleLabels } from '@/lib/rbac';
import { NotificationBell } from '@/components/NotificationBell';

function SidebarNavItem({
  item,
  collapsed,
  depth = 0,
  onMobileClose,
}: {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
  onMobileClose?: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(() => {
    if (item.url && pathname.startsWith(item.url)) return true;
    return !!item.items?.some(
      (c) => c.url && (pathname === c.url || pathname.startsWith(c.url + '/'))
    );
  });
  const hasChildren = !!item.items?.length;
  const isActive = item.url
    ? pathname === item.url || pathname.startsWith(item.url + '/')
    : false;
  const isChildActive = item.items?.some(
    (c) => c.url && (pathname === c.url || pathname.startsWith(c.url + '/'))
  );
  // `depth` drives indentation for nested levels.
  const indentStyle = depth > 0 ? { paddingLeft: depth * 10 } : undefined;

  if (hasChildren && collapsed) {
    // Collapsed rail: parent icons are buttons with a title tooltip that jump
    // to the parent url or the first child with a real url. NEVER render a
    // NavLink with an undefined `to` here.
    const target = item.url ?? item.items?.find((c) => c.url)?.url;
    return (
      <li style={indentStyle}>
        <button
          onClick={() => {
            if (target) {
              navigate(target);
              onMobileClose?.();
            } else {
              setIsOpen(!isOpen);
            }
          }}
          title={item.title}
          aria-label={item.title}
          className={cn(
            'group flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            isChildActive || isActive || isOpen
              ? 'bg-sidebar-accent text-sidebar-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          {item.icon && (
            <item.icon
              className={cn(
                'size-[18px] shrink-0 transition-colors',
                isChildActive || isActive || isOpen
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-sidebar-foreground'
              )}
            />
          )}
        </button>
      </li>
    );
  }

  if (hasChildren) {
    return (
      <li style={indentStyle}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            (isChildActive || isOpen)
              ? 'bg-sidebar-accent text-sidebar-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          {item.icon && (
            <item.icon
              className={cn(
                'size-[18px] shrink-0 transition-colors',
                (isChildActive || isOpen) ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground'
              )}
            />
          )}
          <span className="flex-1 text-left">{item.title}</span>
          <ChevronRight
            className={cn(
              'size-4 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-90'
            )}
          />
        </button>
        {isOpen && (
          <ul className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
            {item.items!.map((child) => (
              <SidebarNavItem
                key={child.title}
                item={child}
                collapsed={false}
                depth={depth + 1}
                onMobileClose={onMobileClose}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // Leaf without a url: render a plain button, NEVER a NavLink with
  // an undefined `to`.
  if (!item.url) {
    return (
      <li style={indentStyle}>
        <button
          onClick={onMobileClose}
          title={collapsed ? item.title : undefined}
          aria-label={item.title}
          className={cn(
            'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-2 border-transparent -ml-px pl-[11px]'
          )}
        >
          {item.icon && <item.icon className="size-[18px] shrink-0" />}
          {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
        </button>
      </li>
    );
  }

  return (
    <li style={indentStyle}>
      <NavLink
        to={item.url}
        onClick={onMobileClose}
        className={({ isActive: linkActive }) =>
          cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            (linkActive || isActive)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-primary/10 border-l-2 border-primary -ml-px pl-[11px]'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-2 border-transparent -ml-px pl-[11px]'
          )
        }
        title={collapsed ? item.title : undefined}
      >
        {item.icon && <item.icon className="size-[18px] shrink-0" />}
        {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
        {item.badge && !collapsed && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {item.badge}
          </span>
        )}
      </NavLink>
    </li>
  );
}

function SidebarGroup({
  group,
  collapsed,
  onMobileClose,
}: {
  group: NavGroup;
  collapsed: boolean;
  onMobileClose?: () => void;
}) {
  const { pathname } = useLocation();
  const isGroupChildActive = group.items.some((it) => {
    if (it.url && (pathname === it.url || pathname.startsWith(it.url + '/'))) return true;
    if (it.items) {
      return it.items.some(
        (c) => c.url && (pathname === c.url || pathname.startsWith(c.url + '/'))
      );
    }
    return false;
  });

  const [isOpen, setIsOpen] = useState(() => isGroupChildActive);

  useEffect(() => {
    if (isGroupChildActive) setIsOpen(true);
  }, [isGroupChildActive]);

  if (collapsed) {
    return (
      <div className="mb-1">
        {group.items.map((item) => (
          <SidebarNavItem key={item.title} item={item} collapsed={true} onMobileClose={onMobileClose} />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-150',
          isGroupChildActive || isOpen
            ? 'text-sidebar-foreground'
            : 'text-muted-foreground hover:text-sidebar-foreground'
        )}
      >
        <group.icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
      {isOpen && (
        <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
          {group.items.map((item) => (
            <SidebarNavItem
              key={item.title}
              item={item}
              collapsed={false}
              onMobileClose={onMobileClose}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SchoolSwitcher({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: ctx } = useTenant();
  const { switchRole } = useAuth();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
          P
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-3 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-sidebar-accent"
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
          P
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-sidebar-foreground">eShule Academy</div>
          <div className="truncate text-xs text-muted-foreground">
            {ctx?.activeRole ? roleLabels[ctx.activeRole] : 'No role'}
          </div>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-xl border border-sidebar-border bg-card p-2 shadow-2xl shadow-black/50">
          {ctx?.roles.map((r) => (
            <button
              key={r}
              onClick={() => {
                if (ctx.roles.length > 1) switchRole(r, ctx.roles);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                r === ctx.activeRole
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <div
                className={cn(
                  'grid size-8 place-items-center rounded-lg text-xs font-bold',
                  r === ctx.activeRole
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-sidebar-accent text-muted-foreground'
                )}
              >
                {roleLabels[r]?.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{roleLabels[r]}</div>
              </div>
              {r === ctx.activeRole && (
                <div className="size-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
          <div className="my-2 border-t border-sidebar-border" />
          <button
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogIn className="size-4" />
            Switch Account
          </button>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { data: ctx } = useTenant();
  const filtered = filterNavByRole(navGroups, ctx?.activeRole);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SchoolSwitcher collapsed={false} />
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-border">
          <nav className="space-y-1">
            {filtered.map((group) => (
              <SidebarGroup
                key={group.title}
                group={group}
                collapsed={false}
                onMobileClose={onMobileClose}
              />
            ))}
          </nav>
        </div>
        <SidebarFooter collapsed={false} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 md:flex',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex items-center border-b border-sidebar-border',
            collapsed ? 'justify-center py-3' : 'justify-between px-3 py-3'
          )}
        >
          {!collapsed && <SchoolSwitcher collapsed={false} />}
          {collapsed && <SchoolSwitcher collapsed={true} />}
          <button
            onClick={onToggle}
            className={cn(
              'rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
              collapsed && 'absolute right-2 top-3 md:relative md:right-auto md:top-auto'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-border">
          <nav className="space-y-1">
            {filtered.map((group) => (
              <SidebarGroup
                key={group.title}
                group={group}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </div>

        <SidebarFooter collapsed={collapsed} />
      </aside>
    </>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { logout, switchRole } = useAuth();
  const { data: ctx } = useTenant();

  return (
    <div className="border-t border-sidebar-border p-3">
      <div
        className={cn(
          'flex items-center gap-1',
          collapsed && 'justify-center'
        )}
      >
        {ctx && ctx.roles.length > 1 && !collapsed && (
          <select
            value={ctx.activeRole ?? ''}
            onChange={(e) => switchRole(e.target.value as never, ctx.roles)}
            className="min-w-0 flex-1 rounded-lg border border-sidebar-border bg-sidebar-accent px-2 py-1.5 text-xs text-muted-foreground"
          >
            {ctx.roles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={logout}
          className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Logout"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function Header({
  onToggleSidebar,
  onSearch,
}: {
  onToggleSidebar: () => void;
  onSearch?: () => void;
}) {
  const [yearOpen, setYearOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const yearRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setYearOpen(false);
    setAddOpen(false);
    setLangOpen(false);
    setProfileOpen(false);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const targets = [yearRef, addRef, langRef, profileRef];
      for (const ref of targets) {
        if (ref.current && ref.current.contains(e.target as Node)) return;
      }
      closeAll();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeAll]);

  const { logout } = useAuth();
  const { data: ctx } = useTenant();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserEmail(data.user?.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRoleLabel = ctx?.activeRole ? roleLabels[ctx.activeRole] : null;
  const displayName = activeRoleLabel ?? 'User';
  const displaySub =
    userEmail ?? (ctx?.userId ? `ID ${ctx.userId.slice(0, 8)}` : 'No account');
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-sm transition-all duration-200 sm:px-6 lg:px-8">
      {/* Mobile menu toggle */}
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      {/* Global search */}
      <div className="hidden flex-1 md:block lg:max-w-md">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Search anything...</span>
          <kbd className="hidden rounded-md border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground lg:inline-block">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Mobile search */}
      <button
        onClick={onSearch}
        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
        aria-label="Search"
      >
        <Search className="size-5" />
      </button>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-1">
        {/* Academic Year Selector */}
        <div ref={yearRef} className="relative hidden sm:block">
          <button
            onClick={() => { closeAll(); setYearOpen(!yearOpen); }}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <CalendarDays className="size-4" />
            <span className="hidden lg:inline">2025-2026</span>
            <ChevronDown className={cn('size-3 transition-transform', yearOpen && 'rotate-180')} />
          </button>
          {yearOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border bg-card p-2 shadow-xl">
              {['2025-2026', '2024-2025', '2023-2024'].map((year) => (
                <button
                  key={year}
                  onClick={() => setYearOpen(false)}
                  className={cn(
                    'flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors',
                    year === '2025-2026'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {year}
                  {year === '2025-2026' && <span className="ml-auto text-xs text-primary">Current</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div ref={langRef} className="relative hidden md:block">
          <button
            onClick={() => { closeAll(); setLangOpen(!langOpen); }}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Languages className="size-4" />
            <span className="hidden lg:inline">EN</span>
            <ChevronDown className={cn('size-3 transition-transform', langOpen && 'rotate-180')} />
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-border bg-card p-2 shadow-xl">
              {[
                { code: 'en', label: 'English' },
                { code: 'sw', label: 'Swahili' },
                { code: 'fr', label: 'French' },
                { code: 'ar', label: 'Arabic' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLangOpen(false)}
                  className={cn(
                    'flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors',
                    lang.code === 'en'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add New Dropdown */}
        <div ref={addRef} className="relative hidden sm:block">
          <button
            onClick={() => { closeAll(); setAddOpen(!addOpen); }}
            className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            <span className="hidden lg:inline">Add New</span>
            <ChevronDown className={cn('size-3 transition-transform', addOpen && 'rotate-180')} />
          </button>
          {addOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-border bg-card p-2 shadow-xl">
              {[
                { label: 'Add Student', icon: GraduationCap, url: '/admin/admissions/new' },
                { label: 'Add Teacher', icon: User, url: '/admin/teachers/add' },
                { label: 'Add Staff', icon: Users, url: '/admin/staff' },
                { label: 'Create Event', icon: CalendarDays, url: '/admin/events' },
                { label: 'New Invoice', icon: CreditCard, url: '/finance/invoices' },
              ].map((action) => (
                <NavLink
                  key={action.label}
                  to={action.url}
                  onClick={() => setAddOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <action.icon className="size-4" />
                  {action.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell — live unread count from the notifications table */}
        <div className="relative">
          <NotificationBell />
        </div>

        {/* User Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { closeAll(); setProfileOpen(!profileOpen); }}
            className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-accent"
          >
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              {avatarInitial}
            </div>
            <div className="hidden text-left xl:block">
              <div className="text-sm font-medium leading-tight">{displayName}</div>
              <div className="text-xs text-muted-foreground">{displaySub}</div>
            </div>
            <ChevronDown className="hidden size-4 text-muted-foreground xl:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl">
              <div className="mb-2 border-b border-border px-3 py-2">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displaySub}</p>
              </div>
              <NavLink
                to="/admin/settings/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="size-4" />
                My Profile
              </NavLink>
              <NavLink
                to="/admin/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="size-4" />
                Settings
              </NavLink>
              <NavLink
                to="/about"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <HelpCircle className="size-4" />
                Help & Support
              </NavLink>
              <div className="my-2 border-t border-border" />
              <button
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


