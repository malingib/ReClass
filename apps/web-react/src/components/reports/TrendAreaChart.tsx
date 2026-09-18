import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { moneyCompactKES } from '@/lib/format';
import type { MonthlySeries } from './types';

/**
 * Trend area chart — welfare-connect ContributionTrendChart port.
 * Gradient area + 3-stat footer (periods / total / transactions).
 */
export function TrendAreaChart({
  data,
  title = 'Collection trend',
  description = 'Monthly amounts over time',
}: {
  data: MonthlySeries[];
  title?: string;
  description?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">No data available for this period.</p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const count = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={`${title}: ${description}. Total ${moneyCompactKES(total)} across ${data.length} periods, ${count.toLocaleString()} records.`}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reclassTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={56} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => moneyCompactKES(v)} width={110} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px' }}
              formatter={(value) => [moneyCompactKES(value), 'Amount']}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#reclassTrend)" name="Amount" />
          </AreaChart>
        </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="text-sm">
            <p className="text-muted-foreground">Periods</p>
            <p className="text-2xl font-bold tabular-nums text-info-foreground">{data.length}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Total</p>
            <p className="text-2xl font-bold tabular-nums text-success-foreground">{moneyCompactKES(total)}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Records</p>
            <p className="text-2xl font-bold tabular-nums text-primary">{count.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
