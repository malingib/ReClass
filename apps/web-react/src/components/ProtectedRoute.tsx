import * as React from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveRole, isRole, setStoredActiveRole, type Permission } from '@/lib/rbac';

export function ProtectedRoute({
  allowedRoles,
  requiredPermissions = [],
  children,
}: {
  allowedRoles: readonly string[];
  requiredPermissions?: readonly Permission[];
  children: React.ReactNode;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'deny'>('loading');

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { if (live) setState('deny'); return; }
      const uid = data.session.user.id;
      const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      const held = ((rows ?? []) as { role: string }[]).map((r) => r.role).filter(isRole);
      const stored = getStoredActiveRole();
      if (!stored && held[0]) setStoredActiveRole(held[0]);
      const effective = stored && held.includes(stored) ? stored : held[0];
      if (!effective) { if (live) setState('deny'); return; }
      const roleAllowed = (allowedRoles as readonly string[]).includes(effective);
      if (!roleAllowed) { if (live) setState('deny'); return; }

      if (requiredPermissions.length) {
        const { data: roleRows } = await supabase.from('role_permissions').select('permission_id').in('role', held);
        const ids = [...new Set(((roleRows ?? []) as { permission_id: string }[]).map((r) => r.permission_id))];
        const { data: permissionRows } = ids.length
          ? await supabase.from('permissions').select('code').in('id', ids)
          : { data: [] as { code: string }[] };
        const permissions = new Set(((permissionRows ?? []) as { code: string }[]).map((r) => r.code));
        const authorized = held.includes('super_admin') || requiredPermissions.some((permission) => permissions.has(permission));
        if (!authorized) { if (live) setState('deny'); return; }
      }
      if (live) setState('ok');
    })();
    return () => { live = false; };
  }, [allowedRoles, requiredPermissions]);

  if (state === 'loading') return <div className="grid min-h-[50vh] place-items-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (state === 'deny') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function useAuthorization() {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const uid = data.session.user.id;
      const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      const held = ((rows ?? []) as { role: string }[]).map((r) => r.role);
      setRoles(held);
      const { data: roleRows } = await supabase.from('role_permissions').select('permission_id').in('role', held);
      const ids = [...new Set(((roleRows ?? []) as { permission_id: string }[]).map((r) => r.permission_id))];
      if (!ids.length) return;
      const { data: permissionRows } = await supabase.from('permissions').select('code').in('id', ids);
      setPermissions([...new Set(((permissionRows ?? []) as { code: string }[]).map((r) => r.code))]);
    })();
  }, []);
  return {
    hasRole: (r: string | string[]) => { const need = Array.isArray(r) ? r : [r]; return need.some((x) => roles.includes(x)); },
    hasPermission: (p: string | string[]) => { const need = Array.isArray(p) ? p : [p]; return need.some((x) => permissions.includes(x)); },
    roles,
    permissions,
  };
}
