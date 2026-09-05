import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';
import { getParentLedger } from '$lib/server/_finance/payments';
import { PAGE_OVERVIEW } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);

  // Announcements are independent of student ownership, so fetch them in parallel
  // with the early-return path instead of making parents wait on unrelated work.
  const announcementsQuery = locals.srv
    .from('comm_announcements')
    .select('id, title, body, audience, priority, published_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .or('audience.eq.all,audience.eq.parents')
    .order('published_at', { ascending: false })
    .limit(10);

  if (studentIds.length === 0) {
    const { data: announcements } = await announcementsQuery;
    return { parent, students: [], payments: [], announcements: announcements ?? [], ledger: [] };
  }

  const [{ data: students }, { data: payments }, { data: announcements }, ledger] = await Promise.all([
    locals.srv
      .from('students')
      .select('id, admission_no, first_name, last_name, grade, status')
      .eq('tenant_id', tenantId)
      .in('id', studentIds),
    locals.srv
      .from('payments')
      .select('id, amount, domain, fee_types(name), created_at')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })
      .limit(PAGE_OVERVIEW),
    announcementsQuery,
    getParentLedger(locals.srv, tenantId, studentIds),
  ]);

  return {
    parent,
    students: students ?? [],
    payments: (payments ?? []).map((p: { id: string; amount?: number | null; domain?: string; fee_types?: { name?: string | null } | null; created_at?: string | null }) => ({
      ...p,
      fee_type: p.fee_types?.name ?? '—',
    })),
    announcements: announcements ?? [],
    ledger,
  };
};
