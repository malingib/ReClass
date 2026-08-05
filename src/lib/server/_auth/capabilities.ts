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
  | 'finance:view'
  | 'sis:view';

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
