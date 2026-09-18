import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type School = {
  id: number;
  name?: string | null;
  slug?: string | null;
  logo_url?: string | null;
  currency?: string | null;
  academic_year?: string | null;
  timezone?: string | null;
  sms_sender_id?: string | null;
  mpesa_shortcode?: string | null;
  mpesa_paybill?: string | null;
  school_payment_channel?: 'bank' | 'mpesa' | null;
  remedial_payment_channel?: 'bank' | 'mpesa' | null;
  payroll_rate_per_session?: number | null;
  settings?: Record<string, unknown> | null;
};

/** Single-school deployment with no tenancy: the one row in school_settings. */
export function useSchool() {
  return useQuery({
    queryKey: ['school'],
    queryFn: async () => {
      const { data, error } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as School | null;
    },
    staleTime: 60_000,
  });
}

export function useUpdateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<School>) => {
      const { data: existing } = await supabase.from('school_settings').select('id').limit(1).maybeSingle();
      const id = (existing as { id?: number } | null)?.id;
      if (id == null) {
        const { error } = await supabase.from('school_settings').insert({ id: 1, ...patch, updated_at: new Date().toISOString() });
        if (error) throw error;
        return;
      }
      // Upsert: first save creates the singleton even if seeds never ran.
      const { error } = await supabase.from('school_settings').upsert({ id, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school'] }),
  });
}
