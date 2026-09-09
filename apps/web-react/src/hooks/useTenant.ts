import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveRole, isRole, setStoredActiveRole, type Role } from '@/lib/rbac';

export type SchoolContext = {
  userId: string;
  roles: Role[];
  activeRole: Role | null;
};

/** Resolve the authenticated user's roles. The eShule deployment is single-school. */
export function useTenant() {
  return useQuery({
    queryKey: ['school-context'],
    queryFn: async (): Promise<SchoolContext> => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return { userId: '', roles: [], activeRole: null };

      const { data: rows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid);

      const roles = ((rows ?? []) as { role: string }[])
        .map((row) => row.role)
        .filter(isRole);

      const stored = getStoredActiveRole();
      const activeRole = (stored && roles.includes(stored) ? stored : roles[0] ?? null) as Role | null;
      if (activeRole) setStoredActiveRole(activeRole);

      return { userId: uid, roles, activeRole };
    },
    staleTime: 60_000,
  });
}
