import { describe, it, expect } from 'vitest';
import { flattenStudentName } from '$lib/server/_platform/query';
import { paginatedQuery } from '$lib/server/_platform/query';

describe('flattenStudentName', () => {
  it('extracts name from array students field', () => {
    const row = { students: [{ first_name: 'John', last_name: 'Doe', admission_no: 'ADM001' }] };
    const result = flattenStudentName(row);
    expect(result.student_name).toBe('John Doe');
    expect(result.admission_no).toBe('ADM001');
  });

  it('extracts name from single object students field', () => {
    const row = { students: { first_name: 'Jane', last_name: 'Smith', admission_no: 'ADM002' } };
    const result = flattenStudentName(row);
    expect(result.student_name).toBe('Jane Smith');
    expect(result.admission_no).toBe('ADM002');
  });

  it('returns Unknown for missing students', () => {
    const row = { students: null };
    const result = flattenStudentName(row);
    expect(result.student_name).toBe('Unknown');
    expect(result.admission_no).toBe('—');
  });

  it('returns Unknown for empty array', () => {
    const row = { students: [] };
    const result = flattenStudentName(row);
    expect(result.student_name).toBe('Unknown');
    expect(result.admission_no).toBe('—');
  });

  it('handles missing first_name or last_name', () => {
    const row = { students: [{ first_name: '', last_name: '', admission_no: 'ADM003' }] };
    const result = flattenStudentName(row);
    expect(result.student_name).toBe('Unknown');
    expect(result.admission_no).toBe('ADM003');
  });
});

// A chainable mock that records every builder call for assertions.
function mockClient() {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};
  const rec = (method: string) => (...args: unknown[]) => { calls.push({ method, args }); return builder; };
  for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'or', 'is', 'order', 'range']) builder[m] = rec(m);
  // Terminal await resolves to a PostgREST-like result.
  (builder as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    resolve({ data: [], count: 0, error: null });
  const sb = { from: (t: string) => { calls.push({ method: 'from', args: [t] }); return builder; } };
  return { sb: sb as never, calls };
}

describe('paginatedQuery', () => {
  it('always scopes both queries to tenant_id', async () => {
    const { sb, calls } = mockClient();
    await paginatedQuery(sb, 'students', 'tenant-123', { select: 'id' });
    const eqTenant = calls.filter((c) => c.method === 'eq' && c.args[0] === 'tenant_id' && c.args[1] === 'tenant-123');
    expect(eqTenant.length).toBe(2); // count query + data query
  });

  it('adds a sanitized ilike OR filter when searching', async () => {
    const { sb, calls } = mockClient();
    await paginatedQuery(sb, 'students', 't1', {
      select: 'id',
      search: { term: 'jo,hn(%)', columns: ['first_name', 'last_name'] },
    });
    const orCalls = calls.filter((c) => c.method === 'or');
    expect(orCalls.length).toBe(2);
    const expr = orCalls[0].args[0] as string;
    // Injection characters (comma, parens) are stripped; literal % is escaped for ILIKE.
    // The pattern is: opening wildcard % + escaped literal  \%  + closing wildcard %
    expect(expr).toBe('first_name.ilike.%john\\%%,last_name.ilike.%john\\%%');
    expect(expr).not.toContain('(');
    expect(expr).not.toContain(')');
  });

  it('omits the OR filter when the search term is blank', async () => {
    const { sb, calls } = mockClient();
    await paginatedQuery(sb, 'students', 't1', { select: 'id', search: { term: '   ', columns: ['first_name'] } });
    expect(calls.some((c) => c.method === 'or')).toBe(false);
  });

  it('applies range for the requested page', async () => {
    const { sb, calls } = mockClient();
    await paginatedQuery(sb, 'students', 't1', { select: 'id', page: 3, pageSize: 20 });
    const range = calls.find((c) => c.method === 'range');
    expect(range?.args).toEqual([40, 59]);
  });
});
