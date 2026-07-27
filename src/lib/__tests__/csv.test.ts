import { describe, it, expect } from 'vitest';
import { csvResponse } from '$lib/server/csv';

describe('csvResponse', () => {
  it('returns a Response with CSV content', () => {
    const res = csvResponse(['Name', 'Score'], [['Alice', '85'], ['Bob', '92']], 'results.csv');
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="results.csv"');
  });

  it('produces correct CSV body', async () => {
    const res = csvResponse(['Name', 'Score'], [['Alice', '85'], ['Bob', '92']], 'results.csv');
    const body = await res.text();
    expect(body).toBe('Name,Score\n"Alice","85"\n"Bob","92"');
  });

  it('escapes double quotes in values', async () => {
    const res = csvResponse(['Note'], [['He said "hello"']], 'notes.csv');
    const body = await res.text();
    expect(body).toBe('Note\n"He said ""hello"""');
  });

  it('handles empty rows', async () => {
    const res = csvResponse(['A', 'B'], [], 'empty.csv');
    const body = await res.text();
    expect(body).toBe('A,B\n');
  });

  it('handles null/undefined values', async () => {
    const res = csvResponse(['A'], [[null], [undefined]], 'nulls.csv');
    const body = await res.text();
    expect(body).toBe('A\n""\n""');
  });
});
