import type { RequestHandler } from './$types';
import { getParentOwnership } from '$lib/server/_auth/ownership';

export const GET: RequestHandler = async ({ locals, url }) => {
  const studentId = url.searchParams.get('student_id');
  const feeTypeId = url.searchParams.get('fee_type_id');
  if (!studentId || !feeTypeId) return new Response('Missing student_id or fee_type_id', { status: 400 });

  // A parent may only poll checkout status for THEIR OWN children.
  const { tenantId, studentIds } = await getParentOwnership(locals);
  if (!studentIds.includes(studentId)) {
    return new Response(JSON.stringify({ status: 'unknown' }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  const { data } = await locals.srv
    .from('checkout_requests')
    .select('status, amount')
    .eq('student_id', studentId)
    .eq('fee_type_id', feeTypeId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return new Response(JSON.stringify(data ?? { status: 'unknown' }), {
    headers: { 'content-type': 'application/json' },
  });
};
