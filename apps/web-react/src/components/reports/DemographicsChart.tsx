import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CategoryBreakdown } from './types';

const FALLBACK_COLORS = ['var(--primary)', 'var(--info)', 'var(--success)', 'var(--warning)', 'var(--destructive)'];

/**
 * Demographics chart — welfare-connect MemberDemographicsChart port.
 * Generic pie + breakdown list. Use for students by gender, class,
 * boarding status, fee-paying status, etc.
 */
export function DemographicsChart({
  groups,
  title = 'Demographics',
  description = 'Distribution breakdown',
}: {
  groups: { title: string; description?: string; data: CategoryBreakdown[] }[];
  title?: string;
  description?: string;
}) {
  const isMobile = useIsMobile();
  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">No demographic data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {groups.map((group) => {
        const total = group.data.reduce((sum, d) => sum + d.value, 0);
        if (group.data.length === 0) {
          return (
            <Card key={group.title} className="shadow-sm">
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
                {group.description && <CardDescription>{group.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <p className="py-8 text-center text-muted-foreground">No data available for this period.</p>
              </CardContent>
            </Card>
          );
        }
        const summary = `${group.title}: ${group.data.map((d) => `${d.label} ${d.value}`).join(', ')}`;
        return (
          <Card key={group.title} className="shadow-sm">
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              {group.description && <CardDescription>{group.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div role="img" aria-label={summary}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={group.data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={isMobile ? false : ({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="label"
                    >
                      {group.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px' }}
                      formatter={(value) => [`${Number(value ?? 0)}`, 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center space-y-3">
                  {group.data.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }} />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums">{item.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
