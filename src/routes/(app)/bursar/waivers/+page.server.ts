import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.srv;

  const tenantFilter = (q: any) => {
    if (locals.tenantId) return q.eq('tenant_id', locals.tenantId);
    return q;
  };

  const [waiversRes, invoicesRes] = await Promise.all([
    tenantFilter(
      db
        .from('waivers')
        .select(`
          id, amount, reason, created_at,
          invoices!inner(amount_due, amount_paid, status, students!inner(first_name, last_name, admission_no))
        `)
        .order('created_at', { ascending: false })
        .limit(100)
    ),
    tenantFilter(
      db
        .from('invoices')
        .select('id, amount_due, amount_paid, status, students(first_name, last_name, admission_no)')
        .not('status', 'eq', 'paid')
        .not('status', 'eq', 'waived')
        .order('created_at', { ascending: false })
        .limit(500)
    ),
  ]);

  const invoiceData = (invoicesRes.data ?? []).map((inv: any) => {
    const student = Array.isArray(inv.students) ? inv.students[0] : inv.students;
    return {
      ...inv,
      student_name: student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : 'Unknown',
      admission_no: student?.admission_no ?? '—',
    };
  });

  const waiversData = (waiversRes.data ?? []).map((w: any) => {
    const invoice = w.invoices;
    const student = invoice?.students ? (Array.isArray(invoice.students) ? invoice.students[0] : invoice.students) : null;
    return {
      ...w,
      student_name: student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : '—',
      admission_no: student?.admission_no ?? '—',
      invoice_status: invoice?.status ?? '—',
    };
  });

  return {
    waivers: waiversData,
    invoices: invoiceData,
  };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const db = locals.srv;
    const form = await request.formData();

    const invoiceId = form.get('invoice_id') as string;
    const amount = parseFloat(form.get('amount') as string);
    const reason = form.get('reason') as string;

    if (!invoiceId || !reason || !amount || amount <= 0) {
      return fail(400, { error: 'Invoice, amount, and reason are required. Amount must be greater than 0.' });
    }

    // Verify the invoice exists and get its current state
    const { data: invoice } = await db
      .from('invoices')
      .select('id, amount_due, amount_paid, status')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return fail(404, { error: 'Invoice not found.' });
    }

    if (invoice.status === 'paid' || invoice.status === 'waived') {
      return fail(400, { error: 'Invoice is already ' + invoice.status + '.' });
    }

    if (amount > Number(invoice.amount_due) - Number(invoice.amount_paid)) {
      return fail(400, { error: `Waiver amount cannot exceed the outstanding balance of KES ${(Number(invoice.amount_due) - Number(invoice.amount_paid)).toLocaleString()}.` });
    }

    // Create the waiver
    const { data: waiver, error: waiverError } = await db
      .from('waivers')
      .insert({
        tenant_id: locals.tenantId,
        invoice_id: invoiceId,
        amount,
        reason,
        granted_by: locals.user?.id,
      })
      .select()
      .single();

    if (waiverError) {
      console.error('Waiver create error:', waiverError);
      return fail(500, { error: 'Failed to create waiver. Please try again.' });
    }

    // Update the invoice's amount_paid or status
    const newPaid = Number(invoice.amount_paid) + amount;
    const newStatus = newPaid >= Number(invoice.amount_due) ? 'waived' : invoice.status;

    await db
      .from('invoices')
      .update({ amount_paid: newPaid, status: newStatus })
      .eq('id', invoiceId);

    // Write audit log
    await db.from('audit_log').insert({
      tenant_id: locals.tenantId,
      actor_id: locals.user?.id,
      action: 'waiver_granted',
      entity: 'waivers',
      entity_id: waiver?.id,
      before: { invoice_id: invoiceId, amount_paid: invoice.amount_paid, status: invoice.status },
      after: { invoice_id: invoiceId, amount_paid: newPaid, status: newStatus, waiver_amount: amount, reason },
    });

    return { success: true, amount, reason };
  },
};
