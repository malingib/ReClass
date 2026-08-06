import type { PageServerLoad } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';
import { PAGE_OVERVIEW } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId, parent, studentIds } = await getParentOwnership(locals);

  if (studentIds.length === 0) return { parent, students: [], payments: [], announcements: [] };

  const [{ data: students }, { data: payments }, { data: announcements }] = await Promise.all([
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
    locals.srv
      .from('comm_announcements')
      .select('id, title, body, audience, priority, published_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .or('audience.eq.all,audience.eq.parents')
      .order('published_at', { ascending: false })
      .limit(10),
  ]);

  return {
    parent,
    students: students ?? [],
    payments: (payments ?? []).map((p: any) => ({
      ...p,
      fee_type: p.fee_types?.name ?? '—',
    })),
    announcements: announcements ?? [],
  };
};
