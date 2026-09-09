import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { roleHome, roleLabels } from '@/lib/rbac';

const NAV: { to: string; label: string; roles: string[] }[] = [
  { to: '/admin', label: 'Admin', roles: ['school_admin', 'super_admin', 'principal', 'bursar'] },
  { to: '/admin/sis', label: 'SIS', roles: ['school_admin', 'super_admin', 'principal'] },
  { to: '/finance', label: 'Finance', roles: ['school_admin', 'super_admin', 'bursar'] },
  { to: '/reclass', label: 'ReClass', roles: ['school_admin', 'super_admin', 'principal'] },
  { to: '/comms', label: 'Comms', roles: ['school_admin', 'super_admin', 'principal'] },
  { to: '/parent', label: 'Parent', roles: ['parent'] },
  { to: '/teacher', label: 'Teacher', roles: ['teacher'] },
  { to: '/principal', label: 'Principal', roles: ['principal'] },
  { to: '/bursar', label: 'Bursar', roles: ['bursar'] },
  { to: '/super-admin', label: 'System', roles: ['super_admin'] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { logout, switchRole } = useAuth();
  const { data: ctx } = useTenant();
  const role = ctx?.activeRole;
  const links = NAV.filter((n) => (role ? n.roles.includes(role) : false));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-4 border-b bg-card px-4 py-3">
        <Link to={role ? roleHome[role] : '/'} className="font-semibold text-primary">eShule</Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {links.map((l) => <Link key={l.to} to={l.to} className="rounded-md px-2.5 py-1.5 hover:bg-accent">{l.label}</Link>)}
          <Link to="/notifications" className="rounded-md px-2.5 py-1.5 hover:bg-accent">Alerts</Link>
          <Link to="/account" className="rounded-md px-2.5 py-1.5 hover:bg-accent">Account</Link>
        </nav>
        {ctx && ctx.roles.length > 1 && (
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={role ?? ''} onChange={(e) => switchRole(e.target.value as never, ctx.roles)} aria-label="Active role">
            {ctx.roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
        )}
        <button onClick={logout} className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent">Logout</button>
      </header>
      <main className="mx-auto w-full max-w-[1440px] p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
