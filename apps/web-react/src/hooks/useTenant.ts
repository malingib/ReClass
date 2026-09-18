import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveRole, isRole, setStoredActiveRole, permissionsForRoles, type Permission, type Role } from '@/lib/rbac';

export type SchoolContext = {
  userId: string;
  roles: Role[];
  activeRole: Role | null;
  permissions: Permission[];
};

/**
 * Resolve identity, roles and permissions.
 * Single-school deployment with no tenancy: there is exactly one school, so
 * queries are unscoped and no tenant record is looked up.
 */
export function useTenant() {
  return useQuery({
    queryKey: ['school-context'],
    queryFn: async (): Promise<SchoolContext> => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return { userId: '', roles: [], activeRole: null, permissions: [] };

      const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      const roles = [...new Set((((rows ?? []) as { role: string }[]).map((row) => row.role)).filter(isRole))] as Role[];
      const stored = getStoredActiveRole();
      const activeRole = (stored && roles.includes(stored) ? stored : roles[0] ?? null) as Role | null;
      if (activeRole) setStoredActiveRole(activeRole);

      // Code map is the source of truth (role_permissions tables don't exist
      // yet); supplement with DB rows when the tables ship.
      const permissions = new Set<Permission>(permissionsForRoles(roles));
      try {
        const { data: roleRows } = await supabase.from('role_permissions').select('role, permission_id').in('role', roles);
        const ids = [...new Set(((roleRows ?? []) as { permission_id: string }[]).map((row) => row.permission_id))];
        if (ids.length) {
          const { data: permissionRows } = await supabase.from('permissions').select('id, code').in('id', ids);
          for (const row of ((permissionRows ?? []) as { code: string }[])) {
            if (row.code) permissions.add(row.code as Permission);
          }
        }
      } catch {
        // Tables absent — code map stands.
      }
      return { userId: uid, roles, activeRole, permissions: [...permissions] };
    },
    staleTime: 60_000,
  });
}
