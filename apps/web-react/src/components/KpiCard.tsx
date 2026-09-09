import { Card, CardContent, CardHeader, CardTitle } from './ui';

export function KpiCard({ label, value, icon: Icon, trend }: { label: string; value: string | number; icon?: React.ComponentType<{ className?: string }>; trend?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
      </CardContent>
    </Card>
  );
}
