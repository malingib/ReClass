import { describe, it, expect } from 'vitest';
import { getParentOwnership } from '../server/_auth/ownership';

// Minimal chainable mock for `locals.srv.from(...)`. The postgrest query
// builder is itself awaitable (resolves to { data, error }) once filters are
// applied — the real code does `await srv.from(...).select().eq().eq()`, so
// the final `.eq()` must return a thenable resolving to { data, error }.
function mockSrv(parentRow: unknown, linkRows: unknown[]) {
  const tables: Record<string, unknown> = {
    parents: parentRow,
    guardians_link: linkRows,
  };
  const chain = (rows: unknown) => ({
    select: () => chain(rows),
    eq: () => chain(rows),
    maybeSingle: async () => ({ data: rows, error: null }),
    then: (_resolve: (v: unknown) => void) => _resolve({ data: rows, error: null }),
  });
  return {
    srv: {
      from: (table: string) => chain(tables[table] ?? null),
    },
  };
}

function parentLocals(srv: unknown, role = 'parent') {
  return {
    user: { id: 'u1' },
    role,
    tenantId: 't1',
    srv: srv as any,
  } as any;
}

describe('getParentOwnership', () => {
  it('returns the linked student ids for a parent with children', async () => {
    const srv = mockSrv(
      { id: 'p1', full_name: 'Jane', phone: '0711', sms_consent: true },
      [{ student_id: 's1' }, { student_id: 's2' }],
    ).srv;
    const { tenantId, studentIds } = await getParentOwnership(parentLocals(srv));
    expect(tenantId).toBe('t1');
    expect(studentIds).toEqual(['s1', 's2']);
  });

  it('returns an empty list (not null) when a parent has no linked students', async () => {
    const srv = mockSrv(
      { id: 'p1', full_name: 'Jane', phone: '0711', sms_consent: true },
      [],
    ).srv;
    const { studentIds } = await getParentOwnership(parentLocals(srv));
    // Empty list => the status endpoint returns 'unknown' for any other student_id (J1 fix).
    expect(studentIds).toEqual([]);
  });

  it('throws when the account is not linked to a parent profile', async () => {
    const srv = mockSrv(null, []).srv;
    await expect(getParentOwnership(parentLocals(srv))).rejects.toThrow();
  });
});
