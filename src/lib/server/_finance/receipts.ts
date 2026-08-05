// Per-domain receipts — each domain owns its receipts list.
// Finance (school) receipts: domain='school' (bank/KCB + school M-Pesa).
// Remedial receipts: domain='remedial' (M-Pesa paybill).

type ReceiptRow = {
  id: string; student_name?: string; admission_no?: string; grade?: string; fee_type?: string;
  amount?: number | null; method?: string | null; domain?: string; bank_name?: string | null;
  created_at?: string | null;
};

export async function getReceipts(
  sb: App.Locals['srv'],
  tenantId: string,
  domain: 'school' | 'remedial',
) {
  const { data: payments } = await sb
    .from('payments')
    .select(`
      id, amount, method, domain, bank_reference, mpesa_receipt, phone, receipt_no, created_at,
      students!inner(first_name, last_name, admission_no, grade),
      fee_types(name)
    `)
    .eq('tenant_id', tenantId)
    .eq('domain', domain)
    .eq('status', 'paid')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  return (payments ?? []).map((p) => ({
    ...p,
    student_name: `${(p.students as any)?.first_name ?? ''} ${(p.students as any)?.last_name ?? ''}`.trim() || '—',
    admission_no: (p.students as any)?.admission_no ?? '—',
    grade: (p.students as any)?.grade ?? '—',
    fee_type: (p.fee_types as any)?.name ?? '—',
  })) as ReceiptRow[];
}
