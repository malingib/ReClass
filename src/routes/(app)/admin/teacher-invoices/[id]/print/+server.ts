import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTenantRole } from '$lib/server/auth';
import { getTeacherInvoice } from '$lib/server/teacher-invoices';

function esc(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const GET: RequestHandler = async ({ locals, params }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin', 'bursar');
  const inv = await getTeacherInvoice(locals.srv, locals.tenantId, params.id);
  if (!inv) error(404, 'Invoice not found');

  const shillings = Math.floor(inv.amount_due);
  const cents = Math.round((inv.amount_due - shillings) * 100);
  const numberWords = numberToWords(shillings);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Teacher Invoice - ${esc(inv.teacher_name)}</title>
<style>
  @page { margin: 20mm 15mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; margin: 0; padding: 0; }
  .invoice-box { max-width: 210mm; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 2px; }
  .subtitle { color: #666; font-size: 12px; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 10px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; color: #333; border-bottom: 2px solid #ddd; }
  td { border-bottom: 1px solid #eee; }
  .totals td { border: none; padding: 6px 10px; }
  .totals .label { font-weight: 500; color: #666; }
  .totals .value { font-weight: 600; text-align: right; }
  .grand-total { font-size: 16px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #333; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .header-left { }
  .header-right { text-align: right; }
  .header-right p { margin: 2px 0; }
  .badge { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 600; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; }
  .badge-paid { background: #d4edda; color: #155724; }
  .badge-unpaid { background: #fff3cd; color: #856404; }
  .badge-draft { background: #e2e3e5; color: #383d41; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
  .notes { background: #f9f9f9; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 12px; color: #555; }
  @media print { .no-print { display: none; } }
  .no-print { text-align: center; margin-bottom: 20px; }
  .no-print button { padding: 10px 24px; font-size: 14px; background: #1a1a1a; color: white; border: none; border-radius: 6px; cursor: pointer; }
</style>
</head>
<body>
<div class="no-print"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="invoice-box">
  <div class="header-row">
    <div class="header-left">
      <h1>Teacher Invoice</h1>
      <p class="subtitle">Payment record for remedial teaching services</p>
      <p style="margin:16px 0 4px;font-size:14px;font-weight:600;">${esc(inv.teacher_name)}</p>
      <p style="margin:2px 0;color:#666;">Employee #: ${esc(inv.employee_no)}</p>
    </div>
    <div class="header-right">
      <p><strong>Invoice #:</strong> ${esc(inv.id.slice(0, 8).toUpperCase())}</p>
      <p><strong>Date:</strong> ${inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB') : '—'}</p>
      ${inv.due_date ? `<p><strong>Due:</strong> ${new Date(inv.due_date).toLocaleDateString('en-GB')}</p>` : ''}
      <p style="margin-top:8px;"><span class="badge badge-${esc(inv.status)}">${esc(inv.status)}</span></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center;">Sessions</th>
        <th style="text-align:right;">Rate (KES)</th>
        <th style="text-align:right;">Amount (KES)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Remedial teaching sessions${inv.period_start && inv.period_end ? ` (${new Date(inv.period_start).toLocaleDateString('en-GB')} – ${new Date(inv.period_end).toLocaleDateString('en-GB')})` : ''}</td>
        <td style="text-align:center;">${inv.occurrences_count}</td>
        <td style="text-align:right;">${inv.rate_per_session ? Number(inv.rate_per_session).toLocaleString() : '—'}</td>
        <td style="text-align:right;">${Number(inv.amount_due).toLocaleString()}.00</td>
      </tr>
    </tbody>
  </table>

  <table class="totals" style="margin-top:8px;">
    <tr><td class="label">Subtotal</td><td class="value">KES ${Number(inv.amount_due).toLocaleString()}.00</td></tr>
    ${Number(inv.amount_paid) > 0 ? `<tr><td class="label">Paid</td><td class="value">KES ${Number(inv.amount_paid).toLocaleString()}.00</td></tr>` : ''}
    ${Number(inv.amount_paid) > 0 ? `<tr><td class="label">Balance</td><td class="value">KES ${(Number(inv.amount_due) - Number(inv.amount_paid)).toLocaleString()}.00</td></tr>` : ''}
    <tr class="grand-total"><td class="label">Total Due</td><td class="value">KES ${Number(inv.amount_due).toLocaleString()}.00</td></tr>
  </table>

  <p style="font-size:12px;color:#666;margin-top:8px;">Amount in words: <strong>${numberWords} Kenyan Shillings${cents > 0 ? ` and ${numberToWords(cents)} Cents` : ''} only</strong></p>

  ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${esc(inv.notes)}</div>` : ''}

  <div class="footer">
    <p>ReClass &mdash; Remedial Education Suite</p>
    <p>This is a computer-generated document. No signature required.</p>
  </div>
</div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': `inline; filename="invoice-${inv.id.slice(0, 8)}.html"`,
    },
  });
};

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const chunks: string[] = [];
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let num = Math.floor(n);
  if (num === 0) return 'Zero';
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
