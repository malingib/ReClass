import { describe, expect, it } from 'vitest';
import { monthKeyOf, summarizeFinancialReport, toNum } from './finance';

describe('toNum', () => {
  it.each([
    [null, 0],
    [undefined, 0],
    [0, 0],
    [42, 42],
    ['13.5', 13.5],
    ['not-a-number', 0],
    [NaN, 0],
    [Infinity, 0],
    [-Infinity, 0],
  ])('toNum(%s) → %s', (input, expected) => {
    expect(toNum(input)).toBe(expected);
  });
});

describe('monthKeyOf', () => {
  it.each([
    ['2026-03-15', '2026-03'],
    ['2026-03-15T10:30:00+03:00', '2026-03'],
    [null, null],
    [undefined, null],
    ['', null],
    ['not-a-date', null],
  ])('monthKeyOf(%s) → %s', (input, expected) => {
    expect(monthKeyOf(input)).toBe(expected);
  });
});

describe('summarizeFinancialReport', () => {
  it('returns zeros for empty inputs', () => {
    const s = summarizeFinancialReport([], [], [], []);
    expect(s).toMatchObject({
      feesCollected: 0, feesDue: 0, feesOutstanding: 0, otherIncome: 0,
      totalRevenue: 0, totalExpenses: 0, net: 0, paymentCount: 0, expenseCount: 0,
    });
    expect(s.months).toEqual([]);
    expect(s.expensesByCategory).toEqual([]);
  });

  it('aggregates fees and clamps over-collection to zero outstanding', () => {
    const s = summarizeFinancialReport(
      [{ amount_due: 1000, amount_paid: 600 }, { amount_due: 500, amount_paid: 700 }],
      [], [], [],
    );
    expect(s.feesDue).toBe(1500);
    expect(s.feesCollected).toBe(1300);
    expect(s.feesOutstanding).toBe(200);
  });

  it('clamps negative outstanding (overpaid) to zero', () => {
    const s = summarizeFinancialReport([{ amount_due: 100, amount_paid: 150 }], [], [], []);
    expect(s.feesOutstanding).toBe(0);
  });

  it('adds other income to revenue and net', () => {
    const s = summarizeFinancialReport(
      [{ amount_due: 1000, amount_paid: 800 }],
      [{ amount: 200 }],
      [{ amount: 300, category: 'Utilities', incurred_at: '2026-01-05' }],
      [],
    );
    expect(s.otherIncome).toBe(200);
    expect(s.totalRevenue).toBe(1000);
    expect(s.totalExpenses).toBe(300);
    expect(s.net).toBe(700);
  });

  it('groups expenses by category, sorted desc, defaulting blanks to Other', () => {
    const s = summarizeFinancialReport([], [], [
      { amount: 100, category: 'Salaries', incurred_at: '2026-01-01' },
      { amount: 400, category: 'Salaries', incurred_at: '2026-01-02' },
      { amount: 250, category: null, incurred_at: '2026-01-03' },
      { amount: 50, category: '   ', incurred_at: '2026-01-04' },
    ], []);
    expect(s.expensesByCategory).toEqual([
      { category: 'Salaries', amount: 500 },
      { category: 'Other', amount: 300 },
    ]);
  });

  it('counts only paid payments as inflow, case-insensitively', () => {
    const s = summarizeFinancialReport([], [], [], [
      { amount: 100, status: 'paid', created_at: '2026-02-01' },
      { amount: 200, status: 'PAID', created_at: '2026-02-02' },
      { amount: 999, status: 'pending', created_at: '2026-02-03' },
      { amount: 999, status: 'failed', created_at: '2026-02-04' },
      { amount: 999, status: 'reversed', created_at: '2026-02-05' },
    ]);
    expect(s.paymentCount).toBe(2);
    expect(s.months).toEqual([{ key: '2026-02', inflow: 300, outflow: 0, net: 300 }]);
  });

  it('buckets inflow/outflow by month and keeps only the last six', () => {
    const payments = Array.from({ length: 8 }, (_, i) => ({
      amount: 100, status: 'paid', created_at: `2025-0${i + 1}-15`,
    }));
    const s = summarizeFinancialReport([], [], [], payments);
    expect(s.months).toHaveLength(6);
    expect(s.months[0].key).toBe('2025-03');
    expect(s.months[5].key).toBe('2025-08');
  });

  it('ignores non-finite and undated rows without NaN', () => {
    const s = summarizeFinancialReport(
      [{ amount_due: 'oops', amount_paid: NaN }],
      [{ amount: Infinity }],
      [{ amount: 'x', category: 'Misc', incurred_at: 'bogus' }],
      [{ amount: 50, status: 'paid', created_at: null }],
    );
    expect(s.feesDue).toBe(0);
    expect(s.otherIncome).toBe(0);
    expect(s.totalExpenses).toBe(0);
    expect(s.months).toEqual([]);
    expect(s.paymentCount).toBe(1);
    expect(Number.isNaN(s.net)).toBe(false);
  });
});
