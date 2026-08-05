import z from 'zod';

/**
 * Cross-module domain contracts. These are the ONLY shapes allowed to cross
 * a module boundary horizontally (finance↔remedial↔sis↔communications).
 * An event envelope + a handful of domain payloads; consumers extend via
 * `domain_events` (migration 20260803000001) and notify/finance subscribers.
 */

export const ModuleKeySchema = z.enum([
  'auth',
  'platform',
  'sis',
  'finance',
  'remedial',
  'communications',
  'dashboard',
]);
export type ModuleKey = z.infer<typeof ModuleKeySchema>;

// ── Money events ────────────────────────────────────────────────────────────

export const MoneyEventPayloadSchema = z.object({
  payment_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  amount: z.number().nonnegative(),
  currency: z.string().length(3).default('KES'),
  domain: z.enum(['school', 'remedial']),
  // Optional because manual paybill deposits may arrive unattributed.
  student_id: z.string().uuid().nullable().optional(),
  fee_type_id: z.string().uuid().nullable().optional(),
  mpesa_checkout_id: z.string().optional(),
});
export type MoneyEventPayload = z.infer<typeof MoneyEventPayloadSchema>;

// A receipt is the finalized, tenant-visible projection of a payment.
export const ReceiptIssuedPayloadSchema = MoneyEventPayloadSchema.extend({
  receipt_no: z.string().min(3),
});
export type ReceiptIssuedPayload = z.infer<typeof ReceiptIssuedPayloadSchema>;

// ── Payroll ─────────────────────────────────────────────────────────────────

export const PayrollRunPostedPayloadSchema = z.object({
  payroll_run_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  domain: z.enum(['school', 'remedial']),
  period_start: z.string(), // ISO date
  period_end: z.string(),
  total_amount: z.number().nonnegative(),
  currency: z.string().length(3).default('KES'),
});
export type PayrollRunPostedPayload = z.infer<typeof PayrollRunPostedPayloadSchema>;

// ── Attendance ─────────────────────────────────────────────────────────────

export const AttendanceMarkedPayloadSchema = z.object({
  tenant_id: z.string().uuid(),
  domain: z.enum(['school', 'remedial']),
  student_id: z.string().uuid(),
  session_id: z.string().uuid(),
  occurred_at: z.string(), // ISO timestamp
  status: z.enum(['present', 'absent', 'late', 'excused']),
});
export type AttendanceMarkedPayload = z.infer<typeof AttendanceMarkedPayloadSchema>;

// ── Event envelope ─────────────────────────────────────────────────────────

export const EventTopicSchema = z.enum([
  'money.payment.reconciled',
  'money.receipt.issued',
  'payroll.run.posted',
  'attendance.marked',
]);
export type EventTopic = z.infer<typeof EventTopicSchema>;

export const DomainEventSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  topic: EventTopicSchema,
  payload: z.unknown(),
  occurred_at: z.string().optional(),
  consumed_by: z.array(z.string()).default([]),
});
export type DomainEvent = z.infer<typeof DomainEventSchema>;

export interface DomainEventEmitter {
  emit<TPayload>(topic: EventTopic, tenantId: string, payload: TPayload): Promise<void>;
}
