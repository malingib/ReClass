import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export function TrendChart({ data, kind = 'line' }: {
  title: string;
  data: { label: string; value: number; secondary?: number }[];
  kind?: 'line' | 'bar';
}) {
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer>
        {kind === 'line' ? (
          <LineChart data={data}>
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            {data.some((d) => d.secondary !== undefined) && <Line type="monotone" dataKey="secondary" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
