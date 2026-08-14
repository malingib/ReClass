import type { Role } from '$lib/auth';

// Fine-grained access capabilities for the remedial and other areas.
// Teachers are assigned a teacher_type (remedial | classroom | both) and, where
// finer control is needed, an explicit capability set. This is the single source
// of truth for "who can access what" beyond the coarse role prefix guard.

export type Capability =
  | 'remedial:view'
  | 'remedial:schedule'
  | 'remedial:attendance_mark'
  | 'remedial:attendance_review'
  | 'remedial:fees'
  | 'remedial:committee'   // attendance review (chairman) + payroll (treasurer)
  | 'finance:view'
  | 'sis:view';

/** Remedial committee hats a teacher may wear (mirrors teachers.remedial_role). */
export type RemedialRole = 'chairman' | 'treasurer' | 'member' | 'none';

// Default capability sets by teacher_type. school_admin/principal retain all.
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

export function teacherCapabilities(teacherType: string | null | undefined): Capability[] {
  if (!teacherType) return TEACHER_TYPE_CAPS.both;
  return TEACHER_TYPE_CAPS[teacherType] ?? TEACHER_TYPE_CAPS.both;
}

export function hasCapability(
  role: Role | null | undefined,
  teacherType: string | null | undefined,
  cap: Capability,
): boolean {
  // Admins and principals have full access.
  if (role === 'school_admin' || role === 'super_admin' || role === 'principal' || role === 'bursar') {
    return true;
  }
  if (role === 'teacher') {
    return teacherCapabilities(teacherType).includes(cap);
  }
  return false;
}

/**
 * Whether a logged-in teacher may act as a remedial committee officer.
 * Committee is modeled as a hat on the teacher row (teachers.remedial_role),
 * so this must be resolved from the tenant teacher record, not the JWT.
 */
export function isRemedialOfficer(remRole: RemedialRole | string | null | undefined, hat: RemedialRole): boolean {
  if (hat === 'member') return remRole === 'member';
  return remRole === hat;
}

export function canApproveAttendance(remRole: RemedialRole | string | null | undefined): boolean {
  // Chairman (or member) approves/rejects attendance for the committee.
  return remRole === 'chairman' || remRole === 'member';
}

export function canRunPayroll(remRole: RemedialRole | string | null | undefined): boolean {
  // Treasurer generates payroll + approves payment requests.
  return remRole === 'treasurer';
}

export function canAuthorizePayout(remRole: RemedialRole | string | null | undefined): boolean {
  // Chairman signs off on the actual B2C payout (after treasurer prepares it).
  return remRole === 'chairman';
}
