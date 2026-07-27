import { getServiceClient } from '../_shared/supabase.ts';
import { json, handleOptions, unauthorized, internalError } from '../_shared/response.ts';

const supabase = getServiceClient();
const EXPECTED_TOKEN = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface OverdueInvoice {
  id: string;
  tenant_id: string;
  student_id: string;
  amount_due: number;
  amount_paid: number | null;
  due_date: string;
  last_reminded_at: string | null;
  students: { first_name: string; last_name: string } | null;
  parents: { parent_id: string; parents: { id: string; phone: string; full_name: string } | null }[] | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== EXPECTED_TOKEN) {
    return unauthorized(req);
  }

  try {
    // Find unpaid invoices past due where last reminder is >3 days ago (or never reminded)
    const { data: overdue } = await supabase
      .from('invoices')
      .select(`
        id, tenant_id, student_id, amount_due, amount_paid, due_date, last_reminded_at,
        students!inner(first_name, last_name),
        parents:guardians_link!inner(parent_id, parents!inner(id, phone, full_name))
      `)
      .eq('status', 'unpaid')
      .lt('due_date', new Date().toISOString().slice(0, 10))
      .or(
        `last_reminded_at.is.null,last_reminded_at.lt.${new Date(Date.now() - 3 * 864e5).toISOString()}`
      )
      .limit(200);

    // Batch-check which tenants have sms_payment_reminder enabled.
    const uniqueTenants = [...new Set((overdue ?? []).map((inv: { tenant_id: string }) => inv.tenant_id))];
    const { data: tenantSettings } = await supabase
      .from('tenants')
      .select('id, settings')
      .in('id', uniqueTenants);
    const settingMap = new Map(
      (tenantSettings ?? []).map((t: { id: string; settings?: { sms_payment_reminder?: boolean } | null }) => [t.id, (t.settings?.sms_payment_reminder ?? true) === true]),
    );
    const enabledTenants = new Set(
      uniqueTenants.filter((tid) => settingMap.get(tid) !== false),
    );

    if (!overdue?.length) {
      return json({ processed: 0 }, 200, req);
    }

    let created = 0;
    for (const inv of overdue as OverdueInvoice[]) {
      if (!enabledTenants.has(inv.tenant_id)) continue;
      const parent = inv.parents?.[0]?.parents;
      if (!parent?.phone) continue;

      // Skip if parent has not consented to SMS
      const { data: parentRecord } = await supabase
        .from('parents')
        .select('sms_consent')
        .eq('id', parent.id)
        .eq('tenant_id', inv.tenant_id)
        .maybeSingle();
      if (parentRecord?.sms_consent === false) continue;

      const amountOutstanding = Number(inv.amount_due) - Number(inv.amount_paid ?? 0);
      const student = inv.students;
      const body = `ReClass: Reminder — KES ${amountOutstanding.toLocaleString()} outstanding for ${student?.first_name ?? 'Unknown'} ${student?.last_name ?? ''}. Due ${inv.due_date}. Pay via M-Pesa paybill.`;

      // Optimistic lock: compare against the original last_reminded_at
      // to prevent duplicate SMS from concurrent cron runs.
      const now = new Date().toISOString();
      let updQuery = supabase.from('invoices').update({ last_reminded_at: now }).eq('id', inv.id);
      updQuery = inv.last_reminded_at
        ? updQuery.eq('last_reminded_at', inv.last_reminded_at)
        : updQuery.is('last_reminded_at', null);
      const { error: updErr, data: updData } = await updQuery.select('id');
      if (updErr || !updData?.length) continue;

      await supabase.from('notifications').insert({
        tenant_id: inv.tenant_id,
        channel: 'sms',
        recipient: parent.phone,
        body,
        status: 'queued',
        related_type: 'invoice',
        related_id: inv.id,
      });

      created++;
    }

    return json({ processed: created }, 200, req);
  } catch {
    return internalError(req);
  }
});
