import { describe, it, expect } from 'vitest';
import { csvResponse } from '$lib/server/_platform/csv';

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

  it('neutralizes spreadsheet formula injection', async () => {
    const cases: [string, string][] = [
      ['=HYPERLINK("https://evil","Click")', `A\n"'=HYPERLINK(""https://evil"",""Click"")"`],
      ["+2+3+cmd|'/C calc'!A0", `A\n"'+2+3+cmd|'/C calc'!A0"`],
      ['-2+3', `A\n"'-2+3"`],
      ['@SUM(1+1)', `A\n"'@SUM(1+1)"`],
      ['\t=2+2', `A\n"'\t=2+2"`],
      ['  =2+2', `A\n"'  =2+2"`],
    ];
    for (const [input, expectedBody] of cases) {
      const res = csvResponse(['A'], [[input]], 'inj.csv');
      const body = await res.text();
      expect(body).toBe(expectedBody);
    }
  });

  it('does not mangle normal values that contain formula chars mid-string', async () => {
    const res = csvResponse(['A'], [['hello = world']], 'ok.csv');
    expect(await res.text()).toBe('A\n"hello = world"');
  });
});
