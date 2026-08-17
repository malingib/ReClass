import { fail } from '@sveltejs/kit';
import { logError } from '../_platform/log';
import { enqueuePaymentReceiptSms } from './notify';

// Payment Platform v2 helpers — student ledger, unmatched queue, manual edits.

type StudentRow = {
  id: string; admission_no: string; first_name: string; last_name: string;
  grade?: string | null; status?: string | null;
};

/**
 * Student ledger for a domain: every student (ALL students attend remedials —
 * no enrollment table) with what they've paid in the domain and their balance.
 *
 * Balance is per-domain obligation minus paid. For school, the obligation is
 * the sum of the tenant's school fee_types (termly structures); for remedial,
 * the sum of remedial fee_types (flat per-term). All students share the same
 * obligation set — payments are receipts, so balance = obligation − paid.
 */
export async function getStudentLedger(
  srv: App.Locals['srv'],
  tenantId: string,
  domain: 'school' | 'remedial',
) {
  const [{ data: students }, { data: feeTypes }, { data: payments }] = await Promise.all([
    srv.from('students')
      .select('id, admission_no, first_name, last_name, grade, status')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('first_name'),
    srv.from('fee_types')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('domain', domain)
      .is('deleted_at', null),
    srv.from('payments')
      .select('student_id, amount')
      .eq('tenant_id', tenantId)
      .eq('domain', domain)
      .eq('status', 'paid')
      .limit(10000),
  ]);

  const obligation = (feeTypes ?? []).reduce((s, f) => s + Number(f.amount ?? 0), 0);
  const paidByStudent = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.student_id) continue;
    paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) ?? 0) + Number(p.amount ?? 0));
  }

  return (students ?? [] as StudentRow[]).map((s) => {
    const paid = paidByStudent.get(s.id) ?? 0;
    return {
      ...s,
      obligation,
      paid,
      balance: obligation - paid,
    };
  });
}

/** Transactions for one student in a domain (receipts, newest first). */
export async function getStudentTransactions(
  srv: App.Locals['srv'],
  tenantId: string,
  studentId: string,
  domain: 'school' | 'remedial',
) {
  const { data } = await srv
    .from('payments')
    .select(`
      id, amount, method, domain, receipt_no, mpesa_receipt, bank_reference, status,
      created_at, fee_types(name)
    `)
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .eq('domain', domain)
    .order('created_at', { ascending: false })
    .limit(200);

  return (data ?? []).map((p) => ({
    ...p,
    fee_type: (p.fee_types as { name?: string } | null)?.name ?? '—',
  }));
}

/**
 * Parent-facing ledger: for a parent's set of children (multi-student case —
 * one parent, several students), compute each child's total obligation (school
 * + remedial fee types) and what has been paid, so the portal can show a
 * balance. Payments are receipts, so balance = obligation − paid.
 */
export async function getParentLedger(
  srv: App.Locals['srv'],
  tenantId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) return [];

  const [{ data: students }, { data: feeTypes }, { data: payments }] = await Promise.all([
    srv.from('students')
      .select('id, admission_no, first_name, last_name, grade, status')
      .eq('tenant_id', tenantId)
      .in('id', studentIds)
      .order('first_name'),
    srv.from('fee_types')
      .select('amount, domain')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    srv.from('payments')
      .select('student_id, amount')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)
      .eq('status', 'paid')
      .limit(10000),
  ]);

  const obligation = (feeTypes ?? []).reduce((s, f) => s + Number(f.amount ?? 0), 0);
  const paidByStudent = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.student_id) continue;
    paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) ?? 0) + Number(p.amount ?? 0));
  }

  return (students ?? []).map((s) => {
    const paid = paidByStudent.get(s.id) ?? 0;
    return {
      ...s,
      obligation,
      paid,
      balance: Math.max(0, obligation - paid),
    };
  });
}

/** Open (unmatched) manual deposits — the admin/bursar matching queue. */
export async function getUnmatchedPayments(srv: App.Locals['srv'], tenantId: string) {  const { data } = await srv
    .from('unmatched_payments')
    .select('id, checkout_id, mpesa_receipt, amount, phone, bill_ref, created_at')
    .is('matched_at', null)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200);

  return data ?? [];
}

/**
 * Manually match an unmatched deposit to a student+fee. Creates a `payments`
 * receipt (method=mpesa, domain inferred from the fee type) and stamps the
 * queue row. Every step is audit-logged.
 *
 * Race-safe: the unmatched row is claimed with a conditional UPDATE
 * (`matched_at IS NULL`) AFTER the payment insert. If a concurrent request
 * already claimed it, our just-inserted duplicate receipt is deleted and we
 * return a 409 — so only one payment is ever created for a deposit.
 */
export async function matchUnmatchedPayment(
  srv: App.Locals['srv'],
  tenantId: string,
  actorId: string | undefined,
  unmatchedId: string,
  studentId: string,
  feeTypeId: string | null,
) {
  const { data: u, error: uErr } = await srv
    .from('unmatched_payments')
    .select('id, checkout_id, amount, phone, tenant_id')
    .eq('id', unmatchedId)
    .eq('tenant_id', tenantId)
    .is('matched_at', null)
    .maybeSingle();
  if (uErr || !u) return fail(404, { error: 'Unmatched deposit not found or already matched.' });

  let domain: 'school' | 'remedial' = 'remedial';
  if (feeTypeId) {
    const { data: ft } = await srv.from('fee_types').select('domain').eq('id', feeTypeId).eq('tenant_id', tenantId).maybeSingle();
    domain = ft?.domain === 'school' ? 'school' : 'remedial';
  }

  const receiptNo = `RCP-${tenantId.slice(0, 6).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${u.checkout_id.slice(0, 5).toUpperCase()}`;

  const { data: payment, error: pErr } = await srv
    .from('payments')
    .insert({
      tenant_id: tenantId,
      student_id: studentId,
      fee_type_id: feeTypeId,
      domain,
      amount: u.amount,
      phone: u.phone,
      method: 'mpesa',
      mpesa_checkout_id: u.checkout_id,
      status: 'paid',
      reconciled_at: new Date().toISOString(),
      receipt_no: receiptNo,
    })
    .select('id')
    .single();
  if (pErr || !payment) {
    logError('unmatched_match_payment', pErr, { unmatchedId, studentId });
    return fail(500, { error: 'Failed to create the payment receipt.' });
  }

  // Atomically claim the unmatched row. The conditional `matched_at IS NULL`
  // guarantees only one concurrent request can succeed; the loser rolls back
  // its just-created payment to avoid duplicate receipts for one deposit.
  const { data: claimed, error: mErr } = await srv
    .from('unmatched_payments')
    .update({ matched_to: payment.id, matched_by: actorId ?? null, matched_at: new Date().toISOString() })
    .eq('id', unmatchedId)
    .eq('tenant_id', tenantId)
    .is('matched_at', null)
    .select('id')
    .maybeSingle();
  if (mErr) logError('unmatched_match_stamp', mErr, { unmatchedId });
  if (!claimed) {
    // A concurrent request already matched this deposit — remove our
    // duplicate receipt and report the conflict to the caller.
    await srv.from('payments').delete().eq('id', payment.id).eq('tenant_id', tenantId);
    return fail(409, { error: 'This deposit was already matched by another action.' });
  }

  // A manual match is a payment that landed silently — notify the payer's phone
  // with a receipt now that a payments row exists.
  if (u.phone) {
    await enqueuePaymentReceiptSms(srv, tenantId, payment.id, u.phone, u.amount);
  }

  await srv.from('audit_log').insert({
    tenant_id: tenantId,
    actor_id: actorId ?? null,
    action: 'payment.match',
    entity: 'payments',
    entity_id: payment.id,
    before: { unmatched_id: unmatchedId, checkout_id: u.checkout_id },
    after: { student_id: studentId, fee_type_id: feeTypeId, domain, amount: u.amount },
  });

  return { success: true as const, paymentId: payment.id };
}

/**
 * Manual edit of a payment receipt (student/fee/domain/amount/method/status)
 * with a full audit trail. Reads before-state, applies the patch, logs both.
 */
export async function editPayment(
  srv: App.Locals['srv'],
  tenantId: string,
  actorId: string | undefined,
  paymentId: string,
  patch: {
    student_id?: string | null;
    fee_type_id?: string | null;
    domain?: 'school' | 'remedial';
    amount?: number;
    method?: string;
    status?: string;
    notes?: string;
  },
) {
  const { data: existing } = await srv
    .from('payments')
    .select('id, student_id, fee_type_id, domain, amount, method, status, receipt_no')
    .eq('id', paymentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!existing) return fail(404, { error: 'Payment not found.' });

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) updates[k] = v;
  }
  if (Object.keys(updates).length === 0) return fail(400, { error: 'Nothing to update.' });

  const { error } = await srv.from('payments').update(updates as never).eq('id', paymentId).eq('tenant_id', tenantId);
  if (error) {
    logError('payment_edit', error, { paymentId });
    return fail(500, { error: 'Failed to update the payment.' });
  }

  await srv.from('audit_log').insert({
    tenant_id: tenantId,
    actor_id: actorId ?? null,
    action: 'payment.edit',
    entity: 'payments',
    entity_id: paymentId,
    before: existing,
    after: { ...existing, ...updates },
  });

  return { success: true as const };
}
