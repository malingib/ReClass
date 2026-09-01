import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { getParentOwnership } from '$lib/server/_auth/ownership';

function esc(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const GET: RequestHandler = async ({ locals, params }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar', 'parent', 'teacher', 'principal');

  const { data: p, error: perr } = await locals.srv
    .from('payments')
    .select(`
      id, amount, method, domain, student_id, bank_reference, bank_name, mpesa_receipt, receipt_no, phone, status, created_at, reconciled_at,
      students!inner(first_name, last_name, admission_no, grade),
      fee_types(name)
    `)
    .eq('id', params.id)
    .eq('tenant_id', locals.tenantId)
    .maybeSingle();
  if (perr || !p) error(404, 'Receipt not found');

  // Parent may only view receipts for their own children
  if (locals.role === 'parent') {
    const { studentIds } = await getParentOwnership(locals);
    if (!studentIds.includes((p as any).student_id)) error(403, 'Forbidden');
  }

  const shillings = Math.floor(Number(p.amount));
  const cents = Math.round((Number(p.amount) - shillings) * 100);
  const numberWords = numberToWords(shillings);
  const studentName = `${p.students?.first_name ?? ''} ${p.students?.last_name ?? ''}`.trim() || '—';
  const feeName = (p.fee_types as { name?: string } | null)?.name ?? '—';
  const channel = p.domain === 'remedial' ? 'M-Pesa Paybill' : (p.method === 'bank' ? `${esc(p.bank_name ?? 'Bank')}` : 'Bank');
  const reference = p.method === 'bank' ? (p.bank_reference ?? '—') : (p.mpesa_receipt ?? p.phone ?? '—');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Receipt ${esc(p.receipt_no ?? p.id.slice(0, 8))}</title>
<style>
  @page { margin: 18mm 15mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; margin: 0; }
  .box { max-width: 210mm; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 2px; }
  .subtitle { color: #666; font-size: 12px; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 10px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; border-bottom: 2px solid #ddd; }
  td { border-bottom: 1px solid #eee; }
  .totals td { border: none; padding: 6px 10px; }
  .totals .label { font-weight: 500; color: #666; }
  .totals .value { font-weight: 600; text-align: right; }
  .grand-total { font-size: 16px; font-weight: 700; border-top: 2px solid #333; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .header-right { text-align: right; }
  .header-right p { margin: 2px 0; }
  .badge { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 600; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; background: #d4edda; color: #155724; }
  .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
  @media print { .no-print { display: none; } }
  .no-print { text-align: center; margin-bottom: 20px; }
  .no-print button { padding: 10px 24px; font-size: 14px; background: #1a1a1a; color: white; border: none; border-radius: 6px; cursor: pointer; }
</style>
</head>
<body>
<div class="no-print"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="box">
  <div class="header-row">
    <div>
      <h1>Payment Receipt</h1>
      <p class="subtitle">${p.domain === 'remedial' ? 'Remedial Fees (M-Pesa)' : 'School Fees (Bank)'}</p>
      <p style="margin:14px 0 4px;font-size:14px;font-weight:600;">${esc(studentName)}</p>
      <p style="margin:2px 0;color:#666;">Adm #: ${esc(p.students?.admission_no ?? '—')} · Grade: ${esc(p.students?.grade ?? '—')}</p>
    </div>
    <div class="header-right">
      <p><strong>Receipt #:</strong> ${esc(p.receipt_no ?? p.id.slice(0, 8).toUpperCase())}</p>
      <p><strong>Date:</strong> ${p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '—'}</p>
      <p style="margin-top:8px;"><span class="badge">${esc(p.status ?? 'paid')}</span></p>
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th style="text-align:right;">Amount (KES)</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(feeName)}${p.domain === 'remedial' ? ' — Remedial fee' : ' — School fee'}</td>
        <td style="text-align:right;">${Number(p.amount).toLocaleString()}.00</td>
      </tr>
    </tbody>
  </table>

  <table class="totals" style="margin-top:8px;">
    <tr class="grand-total"><td class="label">Amount Paid</td><td class="value">KES ${Number(p.amount).toLocaleString()}.00</td></tr>
  </table>

  <p style="font-size:12px;color:#666;margin-top:8px;">Amount in words: <strong>${numberWords} Kenyan Shillings${cents > 0 ? ` and ${numberToWords(cents)} Cents` : ''} only</strong></p>
  <p style="font-size:12px;color:#666;margin-top:4px;">Paid via <strong>${channel}</strong> · Reference: <strong>${esc(reference)}</strong>${p.reconciled_at ? ` · Reconciled ${new Date(p.reconciled_at).toLocaleString('en-GB')}` : ''}</p>

  <div class="footer">
    <p>eShule &mdash; School Management Platform</p>
    <p>This is a computer-generated receipt. No signature required.</p>
  </div>
</div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': `inline; filename="receipt-${esc(p.receipt_no ?? p.id.slice(0, 8))}.html"`,
    },
  });
};

function numberToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  const chunks: string[] = [];
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let num = Math.floor(n);
  let scaleIdx = 0;
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      const h = Math.floor(chunk / 100);
      const r = chunk % 100;
      let s = '';
      if (h > 0) s += ones[h] + ' Hundred ';
      if (r > 0) {
        if (r < 20) s += ones[r] + ' ';
        else s += tens[Math.floor(r / 10)] + ' ' + (r % 10 > 0 ? ones[r % 10] + ' ' : '');
      }
      chunks.unshift(s.trim() + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : ''));
    }
    num = Math.floor(num / 1000);
    scaleIdx++;
  }
  return chunks.join(' ').trim();
}
