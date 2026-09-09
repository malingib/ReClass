import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveRole, isRole, setStoredActiveRole, type Permission, type Role } from '@/lib/rbac';

export type SchoolContext = { userId: string; roles: Role[]; activeRole: Role | null; permissions: Permission[] };

/** Resolve identity, roles and explicit permissions. The eShule deployment is single-school. */
export function useTenant() {
  return useQuery({
    queryKey: ['school-context'],
    queryFn: async (): Promise<SchoolContext> => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return { userId: '', roles: [], activeRole: null, permissions: [] };

      const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      const roles = ((rows ?? []) as { role: string }[]).map((row) => row.role).filter(isRole);
      const stored = getStoredActiveRole();
      const activeRole = (stored && roles.includes(stored) ? stored : roles[0] ?? null) as Role | null;
      if (activeRole) setStoredActiveRole(activeRole);

      const { data: roleRows } = await supabase.from('role_permissions').select('role, permission_id').in('role', roles);
      const ids = [...new Set(((roleRows ?? []) as { permission_id: string }[]).map((row) => row.permission_id))];
      let permissions: Permission[] = [];
      if (ids.length) {
        const { data: permissionRows } = await supabase.from('permissions').select('id, code').in('id', ids);
        permissions = ((permissionRows ?? []) as { id: string; code: string }[]).map((row) => row.code).filter(Boolean) as Permission[];
      }
      if (roles.includes('super_admin')) {
        const { data: all } = await supabase.from('permissions').select('code');
        permissions = ((all ?? []) as { code: string }[]).map((row) => row.code) as Permission[];
      }
      return { userId: uid, roles, activeRole, permissions: [...new Set(permissions)] };
    },
    staleTime: 60_000,
  });
}
