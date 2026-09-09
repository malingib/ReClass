import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveRole, isRole, setStoredActiveRole, type Role } from '@/lib/rbac';

export type TenantContext = {
  userId: string;
  roles: Role[];
  activeRole: Role | null;
  tenantId: string | null;
};

/** Resolve user roles + tenant from user_roles (source of truth). */
export function useTenant() {
  return useQuery({
    queryKey: ['tenant-context'],
    queryFn: async (): Promise<TenantContext> => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return { userId: '', roles: [], activeRole: null, tenantId: null };
      const { data: rows } = await supabase
        .from('user_roles')
        .select('role, tenant_id')
        .eq('user_id', uid);
      const list = (rows ?? []) as { role: string; tenant_id: string | null }[];
      const roles = list.map((r) => r.role).filter(isRole);
      const stored = getStoredActiveRole();
      const activeRole = (stored && roles.includes(stored) ? stored : roles[0] ?? null) as Role | null;
      if (activeRole) setStoredActiveRole(activeRole);
      const tenantId = list.find((r) => r.role === activeRole)?.tenant_id ?? list[0]?.tenant_id ?? null;
      return { userId: uid, roles, activeRole, tenantId };
    },
    staleTime: 60_000,
  });
}
