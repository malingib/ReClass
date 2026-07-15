import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: payroll } = await locals.supabase
    .from('payroll')
    .select('id, teacher_id, amount, month, year, status, paid_at')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(100);

  return { payroll: payroll ?? [] };
};
