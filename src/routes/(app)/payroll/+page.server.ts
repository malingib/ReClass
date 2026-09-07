import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal', 'bursar');
  const today = new Date();
  const day = today.getDay() || 7;
  const start = new Date(today);
  start.setDate(today.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);

  const { data: period } = await locals.srv
    .from('payroll_periods')
    .select('id,period_start,period_end,status')
    .eq('tenant_id', tenantId)
    .eq('period_start', s)
    .eq('period_end', e)
    .maybeSingle();

  if (!period) return { payroll: [], periodLabel: `${s} – ${e}`, status: 'draft' };

  // These three lookups depend only on the period and can run concurrently.
  const [{ data: lines }, { data: payments }] = await Promise.all([
    locals.srv.from('payroll_lines').select('id,teacher_user_id,gross_amount,deductions,net_amount,notes').eq('payroll_id', period.id),
    locals.srv.from('payroll_payments').select('teacher_user_id,status,payment_reference').eq('payroll_id', period.id),
  ]);

  const ids = (lines ?? []).map((line: { teacher_user_id: string }) => line.teacher_user_id);
  const [{ data: profiles }, { data: receipts }] = await Promise.all([
    ids.length ? locals.srv.from('profiles').select('id,full_name').in('id', ids) : Promise.resolve({ data: [] }),
    ids.length
      ? locals.srv.from('payment_receipts').select('teacher_user_id,receipt_number').eq('tenant_id', tenantId).eq('payment_domain', 'payroll').in('teacher_user_id', ids)
      : Promise.resolve({ data: [] }),
  ]);

  const names = new Map((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
  const paymentMap = new Map((payments ?? []).map((p: { teacher_user_id: string; status: string; payment_reference: string | null }) => [p.teacher_user_id, p]));
  const receiptMap = new Map((receipts ?? []).map((r: { teacher_user_id: string; receipt_number: string }) => [r.teacher_user_id, r.receipt_number]));

  return {
    periodLabel: `${period.period_start} – ${period.period_end}`,
    status: period.status,
    payroll: (lines ?? []).map((line: { id: string; teacher_user_id: string; gross_amount: number; deductions: number; net_amount: number; notes: string | null }) => ({
      ...line,
      teacher_name: names.get(line.teacher_user_id) ?? 'Teacher',
      status: paymentMap.get(line.teacher_user_id)?.status ?? 'not initiated',
      receipt_number: receiptMap.get(line.teacher_user_id) ?? null,
    })),
  };
};
