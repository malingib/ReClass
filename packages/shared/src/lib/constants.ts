/**
 * Shared status constants across the application
 * Centralizes all status enums to avoid duplication and ensure consistency
 */

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// Checkout Request Status
export const CHECKOUT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired'
} as const;

export type CheckoutStatus = typeof CHECKOUT_STATUS[keyof typeof CHECKOUT_STATUS];

// Notification Status
export const NOTIFICATION_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
  RETRYING: 'retrying',
  OPTOUT: 'optout'
} as const;

export type NotificationStatus = typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS];

// Attendance Status
export const ATTENDANCE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MARKED: 'marked'
} as const;

export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];

// Payroll Status
export const PAYROLL_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type PayrollStatus = typeof PAYROLL_STATUS[keyof typeof PAYROLL_STATUS];

// Session Status
export const SESSION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

// Student Status
export const STUDENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  GRADUATED: 'graduated',
  SUSPENDED: 'suspended'
} as const;

export type StudentStatus = typeof STUDENT_STATUS[keyof typeof STUDENT_STATUS];

// Fee Type Status
export const FEE_TYPE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
} as const;

export type FeeTypeStatus = typeof FEE_TYPE_STATUS[keyof typeof FEE_TYPE_STATUS];

// Error Status
export const ERROR_TYPE = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  PAYMENT: 'payment',
  NETWORK: 'network',
  DATABASE: 'database',
  EXTERNAL_SERVICE: 'external_service',
  BUSINESS_LOGIC: 'business_logic'
} as const;

export type ErrorType = typeof ERROR_TYPE[keyof typeof ERROR_TYPE];

// API Response Status
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending',
  REDIRECT: 'redirect'
} as const;

export type ApiStatus = typeof API_STATUS[keyof typeof API_STATUS];

// Rate Limit Status
export const RATE_LIMIT_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  BLOCKED: 'blocked'
} as const;

export type RateLimitStatus = typeof RATE_LIMIT_STATUS[keyof typeof RATE_LIMIT_STATUS];