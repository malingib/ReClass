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
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={false} />
            {data.some((d) => d.secondary !== undefined) && (
              <Line type="monotone" dataKey="secondary" stroke="#94a3b8" strokeWidth={2} dot={false} />
            )}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
