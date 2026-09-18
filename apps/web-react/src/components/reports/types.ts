/** Report data contracts — welfare-connect reports/types port, school-flavoured. */

export interface MonthlySeries {
  month: string;
  amount: number;
  count: number;
}

export interface CategoryBreakdown {
  label: string;
  value: number;
  color?: string;
}

export interface CashflowPoint {
  month: string;
  income: number;
  expense: number;
}

export interface BalanceSlice {
  name: string;
  balance: number;
  color?: string;
}

export interface ReportDateRange {
  startDate: Date;
  endDate: Date;
  preset?: 'month' | 'quarter' | 'year' | 'custom';
}
