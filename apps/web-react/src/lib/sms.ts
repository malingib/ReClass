// Mobiwave v3 SMS helpers — browser-safe (templates + normalization only).
// Sending itself goes through the `notify` / `sms-campaign` Edge Functions
// which hold MOBIWAVE_API_TOKEN server-side.

export type SmsTriggerKey =
  | 'fee_due'
  | 'receipt_issued'
  | 'payroll_paid'
  | 'attendance_flag'
  | 'announcement'
  | 'manual_custom';

export type SmsTemplateContext = {
  studentName?: string;
  amount?: string;
  deadline?: string;
  receiptNo?: string;
  period?: string;
  message?: string;
};

export function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

const templates: Record<SmsTriggerKey, (c: SmsTemplateContext) => string> = {
  fee_due: (c) =>
    `eShule: ${c.studentName ?? 'Mwanafunzi'} fee balance KES ${c.amount ?? '0'}. Lipa kabla ya ${c.deadline ?? 'sasa'}.`,
  receipt_issued: (c) =>
    `eShule: Receipt ${c.receiptNo ?? ''} confirmed KES ${c.amount ?? ''}. Asante.`,
  payroll_paid: (c) => `eShule: Payroll ${c.period ?? ''} KES ${c.amount ?? ''} processed.`,
  attendance_flag: (c) =>
    `eShule: ${c.studentName ?? 'Mwanafunzi'} attendance alert. Tafadhali wasiliana na shule.`,
  announcement: (c) => `eShule: ${c.message ?? ''}`,
  manual_custom: (c) => c.message ?? '',
};

export function buildSmsPreview(key: SmsTriggerKey, ctx: SmsTemplateContext): string {
  return templates[key](ctx).trim();
}

// v3 payload shape for reference (built server-side in Edge, not here):
// { recipient: "2547…", sender_id: "ESHULE", type: "plain", message: "…" }
export function buildMobiwaveV3Payload(recipient: string, senderId: string, message: string) {
  return { recipient: normalizePhone(recipient), sender_id: senderId, type: 'plain', message };
}
