import type { Role } from '$lib/auth';

// Fine-grained access capabilities. UI visibility and server actions should
// derive from the same capability model; route guards remain the hard boundary.
export type Capability =
  | 'remedial:view'
  | 'remedial:schedule'
  | 'remedial:attendance_mark'
  | 'remedial:attendance_review'
  | 'remedial:fees'
  | 'finance:view'
  | 'finance:receipts'
  | 'sis:view';

export type RemedialRole = 'chairman' | 'treasurer' | 'member' | 'none';

const TEACHER_TYPE_CAPS: Record<string, Capability[]> = {
  remedial: [
    'remedial:view',
    'remedial:schedule',
    'remedial:attendance_mark',
    'remedial:attendance_review',
    'remedial:fees',
  ],
  classroom: ['sis:view'],
  both: [
    'remedial:view',
    'remedial:schedule',
    'remedial:attendance_mark',
    'remedial:attendance_review',
    'remedial:fees',
    'sis:view',
  ],
};

// Role defaults express ownership rather than convenience:
// - school_admin/super_admin: platform-wide operational control
// - principal: oversight, not transaction ownership
// - bursar: school-finance and actual-payment receipt evidence
// - teacher: scoped by teacher_type; committee powers remain hat-based
const ROLE_CAPS: Partial<Record<Role, Capability[]>> = {
  principal: ['remedial:view', 'remedial:attendance_review', 'sis:view', 'finance:view', 'finance:receipts'],
  bursar: ['finance:view', 'finance:receipts'],
};

export function teacherCapabilities(teacherType: string | null | undefined): Capability[] {
  if (!teacherType) return [];
  return TEACHER_TYPE_CAPS[teacherType] ?? [];
}

export function roleCapabilities(role: Role | null | undefined): Capability[] {
  if (role === 'school_admin' || role === 'super_admin') {
    return [
      'remedial:view',
      'remedial:schedule',
      'remedial:attendance_mark',
      'remedial:attendance_review',
      'remedial:fees',
      'finance:view',
      'finance:receipts',
      'sis:view',
    ];
  }
  return role ? (ROLE_CAPS[role] ?? []) : [];
}

export function hasCapability(
  role: Role | null | undefined,
  teacherType: string | null | undefined,
  cap: Capability,
): boolean {
  if (role === 'teacher') return teacherCapabilities(teacherType).includes(cap);
  return roleCapabilities(role).includes(cap);
}

export function isRemedialOfficer(remRole: RemedialRole | string | null | undefined, hat: RemedialRole): boolean {
  if (hat === 'member') return remRole === 'member';
  return remRole === hat;
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