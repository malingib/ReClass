/** Pure finance aggregation — no Supabase, fully unit-testable.
 *  useFinancialReport fetches the rows; everything below summarizes them. */

export function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** `YYYY-MM` bucket for a date/datetime value, or null when unparseable. */
export function monthKeyOf(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v).slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export type ReportMonth = { key: string; inflow: number; outflow: number; net: number };

export type ReportSummary = {
  feesCollected: number;
  feesDue: number;
  feesOutstanding: number;
  otherIncome: number;
  totalRevenue: number;
  expensesByCategory: { category: string; amount: number }[];
  totalExpenses: number;
  net: number;
  months: ReportMonth[];
  paymentCount: number;
  expenseCount: number;
};

export type FinancialReport = ReportSummary;

export function summarizeFinancialReport(
  invoices: { amount_due?: unknown; amount_paid?: unknown }[],
  other: { amount?: unknown }[],
  expenses: { amount?: unknown; category?: string | null; incurred_at?: unknown }[],
  payments: { amount?: unknown; status?: string | null; created_at?: unknown }[],
): ReportSummary {
  let feesCollected = 0;
  let feesDue = 0;
  for (const inv of invoices) {
    feesCollected += toNum(inv.amount_paid);
    feesDue += toNum(inv.amount_due);
  }
  let otherIncome = 0;
  for (const row of other) otherIncome += toNum(row.amount);

  const byCategory = new Map<string, number>();
  let totalExpenses = 0;
  let expenseCount = 0;
  const outflowByMonth = new Map<string, number>();
  for (const row of expenses) {
    const amount = toNum(row.amount);
    totalExpenses += amount;
    expenseCount += 1;
    const cat = (row.category ?? 'Other').trim() || 'Other';
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + amount);
    const key = monthKeyOf(row.incurred_at);
    if (key) outflowByMonth.set(key, (outflowByMonth.get(key) ?? 0) + amount);
  }

  const inflowByMonth = new Map<string, number>();
  let paymentCount = 0;
  for (const row of payments) {
    if (String(row.status ?? '').toLowerCase() !== 'paid') continue;
    const amount = toNum(row.amount);
    paymentCount += 1;
    const key = monthKeyOf(row.created_at);
    if (key) inflowByMonth.set(key, (inflowByMonth.get(key) ?? 0) + amount);
  }

  const keys = [...new Set([...inflowByMonth.keys(), ...outflowByMonth.keys()])].sort().slice(-6);
  const months = keys.map((key) => {
    const inflow = inflowByMonth.get(key) ?? 0;
    const outflow = outflowByMonth.get(key) ?? 0;
    return { key, inflow, outflow, net: inflow - outflow };
  });

  const totalRevenue = feesCollected + otherIncome;
  return {
    feesCollected,
    feesDue,
    feesOutstanding: Math.max(0, feesDue - feesCollected),
    otherIncome,
    totalRevenue,
    expensesByCategory: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    totalExpenses,
    net: totalRevenue - totalExpenses,
    months,
    paymentCount,
    expenseCount,
  };
}
