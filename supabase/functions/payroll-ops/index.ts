import { getServiceClient } from '../_shared/supabase.ts';
import { json, handleOptions, unauthorized, forbidden, badRequest } from '../_shared/response.ts';
import { verifyAuth } from '../_shared/auth.ts';

// Role policy mirrors src/lib/server/_finance/payroll.ts call sites:
// - generate: school_admin / super_admin (preparer)
// - approve: school_admin / super_admin / principal (authorizer, distinct step)
// - mark-paid: school_admin / super_admin / bursar (payer)
// Status machine enforced with compare-and-set: draft → approved → paid.
const GENERATE_ROLES = ['school_admin', 'super_admin'];
const APPROVE_ROLES = ['school_admin', 'super_admin', 'principal'];
const PAY_ROLES = ['school_admin', 'super_admin', 'bursar'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const user = await verifyAuth(req.headers.get('Authorization'));
  if (!user) return unauthorized(req);

  let body: { op?: string; kind?: string; id?: string; period_start?: string; period_end?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('INVALID_JSON', req);
  }
  const { op, kind } = body;
  if (!op || (kind !== 'school' && kind !== 'remedial')) return badRequest('OP_KIND_REQUIRED', req);

  const supabase = getServiceClient();
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id);
  const held = (roleRows ?? []) as { role: string; tenant_id: string }[];
  const needed = op === 'generate' ? GENERATE_ROLES : op === 'approve' ? APPROVE_ROLES : PAY_ROLES;
  const grant = held.find((r) => needed.includes(r.role));
  if (!grant) return forbidden(req);
  const tid = grant.tenant_id;

  if (op === 'approve' || op === 'mark-paid') {
    if (!body.id) return badRequest('ID_REQUIRED', req);
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('status')
      .eq('id', body.id)
      .eq('tenant_id', tid)
      .maybeSingle();
    if (!run) return json({ error: 'NOT_FOUND' }, 404, req);
    const wantFrom = op === 'approve' ? 'draft' : 'approved';
    const wantTo =
      op === 'approve' ? { status: 'approved' } : { status: 'paid', paid_at: new Date().toISOString() };
    if ((run as { status: string }).status !== wantFrom) {
      return json({ error: 'INVALID_TRANSITION', from: (run as { status: string }).status }, 400, req);
    }
    const { error, count } = await supabase
      .from('payroll_runs')
      .update(wantTo, { count: 'exact' })
      .eq('id', body.id)
      .eq('tenant_id', tid)
      .eq('status', wantFrom);
    if (error || count === 0) return json({ error: 'TRANSITION_FAILED' }, 409, req);
    return json({ success: true }, 200, req);
  }

  // generate
  const { period_start, period_end } = body;
  if (!period_start || !period_end) return badRequest('PERIOD_REQUIRED', req);
  if (new Date(period_end) < new Date(period_start)) return badRequest('PERIOD_ORDER', req);

  if (kind === 'school') {
    const { data: salaried } = await supabase
      .from('teachers')
      .select('id, salary_monthly')
      .eq('tenant_id', tid)
      .is('deleted_at', null)
      .not('salary_monthly', 'is', null)
      .gt('salary_monthly', 0);
    if (!salaried?.length) return json({ error: 'NO_SALARIED_TEACHERS' }, 400, req);
    const records = (salaried as { id: string; salary_monthly: number }[]).map((t) => ({
      tenant_id: tid,
      teacher_id: t.id,
      period_start,
      period_end,
      occurrences_count: 1,
      rate_per_session: 0,
      amount: Number(t.salary_monthly ?? 0),
      status: 'draft',
      domain: 'school',
      salary_amount: Number(t.salary_monthly ?? 0),
    }));
    const { error } = await supabase.from('payroll_runs').upsert(records, {
      onConflict: 'tenant_id,teacher_id,period_start,period_end,domain',
      ignoreDuplicates: false,
    });
    if (error) return json({ error: 'GENERATE_FAILED', detail: error.message }, error.code === '23505' ? 409 : 500, req);
    return json({ success: true, count: records.length, totalAmount: records.reduce((s, r) => s + r.amount, 0) }, 200, req);
  }

  // remedial: count attendance via aggregate_payroll_counts, apply per-teacher or tenant rate
  const { data: tenant } = await supabase.from('tenants').select('payroll_rate_per_session').eq('id', tid).single();
  const fallbackRate = Number((tenant as { payroll_rate_per_session?: number } | null)?.payroll_rate_per_session ?? 0);
  if (fallbackRate <= 0) return json({ error: 'RATE_NOT_SET' }, 400, req);
  const { data: teacherRates } = await supabase
    .from('teachers')
    .select('id, remedial_rate_per_session')
    .eq('tenant_id', tid)
    .is('deleted_at', null);
  const rateById = new Map((teacherRates as { id: string; remedial_rate_per_session?: number }[] ?? []).map((t) => [t.id, Number(t.remedial_rate_per_session ?? 0)]));
  const { data: counts, error: countErr } = await supabase.rpc('aggregate_payroll_counts', {
    p_tenant_id: tid,
    p_period_start: period_start,
    p_period_end: period_end,
  });
  if (countErr) return json({ error: 'COUNT_FAILED' }, 500, req);
  const records = ((counts ?? []) as { teacher_id: string; occurrences_count: number }[])
    .filter((c) => c.occurrences_count > 0)
    .map((c) => {
      const rate = (rateById.get(c.teacher_id) ?? 0) > 0 ? rateById.get(c.teacher_id)! : fallbackRate;
      return {
        tenant_id: tid,
        teacher_id: c.teacher_id,
        period_start,
        period_end,
        occurrences_count: c.occurrences_count,
        rate_per_session: rate,
        amount: c.occurrences_count * rate,
        status: 'draft',
        domain: 'remedial',
      };
    });
  if (records.length === 0) return json({ error: 'NO_ATTENDANCE' }, 400, req);
  const { error } = await supabase.from('payroll_runs').upsert(records, {
    onConflict: 'tenant_id,teacher_id,period_start,period_end,domain',
    ignoreDuplicates: false,
  });
  if (error) return json({ error: 'GENERATE_FAILED', detail: error.message }, error.code === '23505' ? 409 : 500, req);
  return json({ success: true, count: records.length, totalAmount: records.reduce((s, r) => s + r.amount, 0) }, 200, req);
});
