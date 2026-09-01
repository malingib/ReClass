import type { Role } from '$lib/auth';

// Fine-grained access capabilities. Base teacher capabilities come from the
// teacher's employment/type. Committee responsibilities are additive "hats"
// resolved from the tenant teacher record and must never be implied by type.
export type Capability =
  | 'remedial:view' | 'remedial:schedule' | 'remedial:attendance_mark'
  | 'remedial:attendance_review' | 'remedial:fees' | 'remedial:committee'
  | 'finance:view' | 'sis:view' | 'payroll:view' | 'payroll:prepare'
  | 'payroll:approve' | 'payment:initiate' | 'payment:approve'
  | 'receipts:view' | 'receipts:print' | 'notifications:send'
  | 'notifications:templates';

export type RemedialRole = 'chairman' | 'treasurer' | 'member' | 'none';

const TEACHER_TYPE_CAPS: Record<string, Capability[]> = {
  remedial: ['remedial:view', 'remedial:schedule', 'remedial:attendance_mark', 'remedial:fees'],
  classroom: ['sis:view'],
  both: ['remedial:view', 'remedial:schedule', 'remedial:attendance_mark', 'remedial:fees', 'sis:view'],
};

export function teacherCapabilities(teacherType: string | null | undefined): Capability[] {
  return teacherType ? (TEACHER_TYPE_CAPS[teacherType] ?? []) : [];
}

export function hasCapability(role: Role | null | undefined, teacherType: string | null | undefined, cap: Capability): boolean {
  if (role === 'school_admin' || role === 'super_admin' || role === 'principal' || role === 'bursar') return true;
  return role === 'teacher' && teacherCapabilities(teacherType).includes(cap);
}

export function isRemedialOfficer(remRole: RemedialRole | string | null | undefined, hat: RemedialRole): boolean {
  return hat === 'member' ? remRole === 'member' : remRole === hat;
}

export function canApproveAttendance(remRole: RemedialRole | string | null | undefined): boolean {
  return remRole === 'chairman' || remRole === 'member';
}

export function canRunPayroll(remRole: RemedialRole | string | null | undefined): boolean {
  return remRole === 'treasurer';
}

export function canAuthorizePayout(remRole: RemedialRole | string | null | undefined): boolean {
  return remRole === 'chairman';
}

export function capabilitiesForTeacher(teacherType: string | null | undefined, remRole: RemedialRole | string | null | undefined): Capability[] {
  const caps = new Set(teacherCapabilities(teacherType));
  if (canApproveAttendance(remRole)) caps.add('remedial:attendance_review');
  if (remRole && remRole !== 'none') caps.add('remedial:committee');
  if (remRole === 'treasurer') { caps.add('payroll:view'); caps.add('payroll:prepare'); }
  if (remRole === 'chairman') caps.add('payment:approve');
  return [...caps];
}
