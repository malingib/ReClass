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
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-4 border-b p-3">
        <Link to={role ? roleHome[role] : '/'} className="font-semibold">eShule</Link>
        <nav className="flex flex-wrap gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
          <Link to="/notifications">Alerts</Link>
          <Link to="/account">Account</Link>
        </nav>
        {ctx && ctx.roles.length > 1 && (
          <select
            className="border p-1 text-sm"
            value={role ?? ''}
            onChange={(e) => switchRole(e.target.value as never, ctx.roles)}
            aria-label="Active role"
          >
            {ctx.roles.map((r) => (
              <option key={r} value={r}>{roleLabels[r]}</option>
            ))}
          </select>
        )}
        <button onClick={logout} className="ml-auto text-sm underline">Logout</button>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
