import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Find unpaid invoices past due where last reminder is >3 days ago (or never reminded)
    const { data: overdue } = await supabase
      .from('invoices')
      .select(`
        id, tenant_id, student_id, amount_due, amount_paid, due_date,
        students!inner(first_name, last_name),
        parents:guardians_link!inner(parent_id, parents!inner(id, phone, full_name))
      `)
      .eq('status', 'unpaid')
      .lt('due_date', new Date().toISOString().slice(0, 10))
      .or(
        `last_reminded_at.is.null,last_reminded_at.lt.${new Date(Date.now() - 3 * 864e5).toISOString()}`
      )
      .limit(200);

    if (!overdue?.length) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: corsHeaders });
    }

    let created = 0;
    for (const inv of overdue) {
      const parent = (inv as any).parents?.[0]?.parents;
      if (!parent?.phone) continue;

      const amountOutstanding = Number(inv.amount_due) - Number(inv.amount_paid ?? 0);
      const body = `ReClass: Reminder — KES ${amountOutstanding.toLocaleString()} outstanding for ${(inv as any).students.first_name} ${(inv as any).students.last_name}. Due ${inv.due_date}. Pay via M-Pesa paybill.`;

      await supabase.from('notifications').insert({
        tenant_id: inv.tenant_id,
        channel: 'sms',
        recipient: parent.phone,
        body,
        status: 'queued',
        related_type: 'invoice',
        related_id: inv.id,
      });

      // Update last_reminded_at
      await supabase.from('invoices').update({
        last_reminded_at: new Date().toISOString(),
      }).eq('id', inv.id);

      created++;
    }

    return new Response(
      JSON.stringify({ processed: created }), { headers: corsHeaders }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders }
    );
  }
});
