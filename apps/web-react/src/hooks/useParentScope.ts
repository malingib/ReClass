import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Resolves the students the signed-in parent may see:
// profiles.id -> parents.profile_id -> guardians_link.parent_id -> student_ids.
export function useParentScope() {
  return useQuery({
    queryKey: ['parent-scope'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return { studentIds: [] as string[] };
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', uid)
        .maybeSingle();
      if (parentError) throw parentError;
      const parentId = (parent as { id: string } | null)?.id;
      if (!parentId) return { studentIds: [] as string[] };
      const { data: links, error: linkError } = await supabase
        .from('guardians_link')
        .select('student_id')
        .eq('parent_id', parentId);
      if (linkError) throw linkError;
      return { studentIds: (links ?? []).map((r) => (r as { student_id: string }).student_id) };
    },
  });
}
