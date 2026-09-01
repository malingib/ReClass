export const NOTIFICATION_EVENTS = {
  PAYROLL_SUBMITTED: { module: 'payroll', recipient: 'principal' },
  PAYROLL_APPROVED: { module: 'payroll', recipient: 'payment_initiator' },
  PAYMENT_INITIATED: { module: 'payroll', recipient: 'payment_approver' },
  PAYMENT_APPROVED_TEACHER: { module: 'payroll', recipient: 'teacher_recipient' },
  TEACHER_RECEIPT_CONFIRMED: { module: 'payroll', recipient: 'payroll_committee' },
  SCHOOL_PAYMENT_RECEIVED: { module: 'bursar', recipient: 'payer_and_bursar' },
  RECLASS_PAYMENT_RECEIVED: { module: 'reclass', recipient: 'payer_and_reclass' },
  ATTENDANCE_SUBMITTED: { module: 'reclass', recipient: 'committee_attendance_approver' },
  ATTENDANCE_APPROVED: { module: 'reclass', recipient: 'teacher' },
  ATTENDANCE_REJECTED: { module: 'reclass', recipient: 'teacher' },
} as const;

export const AUDIT_ACTIONS = {
  PAYROLL_CREATED: 'payroll_created',
  PAYROLL_SUBMITTED: 'payroll_submitted',
  PAYROLL_APPROVED: 'payroll_approved',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_APPROVED: 'payment_approved',
  RECEIPT_GENERATED: 'receipt_generated',
  TEACHER_RECEIPT_CONFIRMED: 'teacher_receipt_confirmed',
  COMMITTEE_ROLE_ASSIGNED: 'committee_role_assigned',
  COMMITTEE_RIGHT_ASSIGNED: 'committee_right_assigned',
  ATTENDANCE_MARKED: 'attendance_marked',
  ATTENDANCE_APPROVED: 'attendance_approved',
  NOTIFICATION_QUEUED: 'notification_queued',
  NOTIFICATION_SENT: 'notification_sent',
  NOTIFICATION_FAILED: 'notification_failed',
  TEMPLATE_CHANGED: 'notification_template_changed',
} as const;

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;
