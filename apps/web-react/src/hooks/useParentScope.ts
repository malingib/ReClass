import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Mirrors getParentOwnership(): resolves the students this parent may see.
export function useParentScope() {
  return useQuery({
    queryKey: ['parent-scope'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return { studentIds: [] as string[] };
      const { data } = await supabase.from('guardians').select('student_id').eq('user_id', uid);
      return { studentIds: (data ?? []).map((r) => (r as { student_id: string }).student_id) };
    },
  });
}
