import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { moneyCompactKES } from '@/lib/format';
import type { BalanceSlice, CashflowPoint } from './types';

const COLORS = ['var(--success)', 'var(--info)', 'var(--warning)', 'var(--primary)', 'var(--destructive)'];

/**
 * Cashflow + balances chart — welfare-connect FinancialOverviewChart port.
 * Bar chart of balances (per fee account / vote head) + optional
 * monthly income-vs-expense + total liquidity footer.
 */
export function CashflowChart({
  balances,
  monthly,
  title = 'Financial overview',
  description = 'Balances and cash flow',
}: {
  balances: BalanceSlice[];
  monthly?: CashflowPoint[];
  title?: string;
  description?: string;
}) {
  const total = balances.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {balances.length > 0 ? (
            <div role="img" aria-label={`${title}: ${balances.map((b) => `${b.name} ${moneyCompactKES(b.balance)}`).join(', ')}. Total liquidity ${moneyCompactKES(total)}.`}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={balances} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => moneyCompactKES(v)} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  formatter={(value) => [moneyCompactKES(value), 'Balance']}
                />
                <Legend />
                <Bar dataKey="balance" name="Balance" radius={[4, 4, 0, 0]}>
                  {balances.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No balance data available.</p>
          )}

          {balances.length > 0 && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {balances.map((b, idx) => (
                  <div key={idx} className="min-w-0 rounded-lg bg-muted/50 p-3 text-center" title={b.name}>
                    <p className="truncate text-xs text-muted-foreground">{b.name}</p>
                    <p className="break-words text-lg font-bold tabular-nums">{moneyCompactKES(b.balance)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Total liquidity</span>
                  <span className="text-2xl font-black tabular-nums text-success-foreground">{moneyCompactKES(total)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {monthly && monthly.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Cash flow</CardTitle>
            <CardDescription>Monthly income vs expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div role="img" aria-label={`Cash flow: ${monthly.map((m) => `${m.month} income ${moneyCompactKES(m.income)}, expenses ${moneyCompactKES(m.expense)}`).join('; ')}.`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => moneyCompactKES(v)} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  formatter={(value) => [moneyCompactKES(value)]}
                />
                <Legend />
                <Bar dataKey="income" name="Income" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
