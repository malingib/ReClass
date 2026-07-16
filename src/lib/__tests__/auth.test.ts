import { describe, it, expect } from 'vitest';
import { isRole, roleRoutes, type Role } from '../auth';

describe('isRole', () => {
  it('returns true for valid roles', () => {
    const valid: Role[] = ['super_admin', 'school_admin', 'principal', 'teacher', 'bursar', 'parent'];
    for (const role of valid) {
      expect(isRole(role)).toBe(true);
    }
  });

  it('returns false for invalid roles', () => {
    expect(isRole('unknown')).toBe(false);
    expect(isRole('')).toBe(false);
    expect(isRole('student')).toBe(false);
  });
});

describe('roleRoutes', () => {
  it('provides a route for every role', () => {
    const roles: Role[] = ['super_admin', 'school_admin', 'principal', 'teacher', 'bursar', 'parent'];
    for (const role of roles) {
      expect(roleRoutes[role]).toBeDefined();
      expect(roleRoutes[role]).toMatch(/^\//);
    }
  });
});
