import { Card, CardContent, CardHeader, CardTitle } from './ui';

export function KpiCard({ label, value, icon: Icon, trend }: { label: string; value: string | number; icon?: React.ComponentType<{ className?: string }>; trend?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        {Icon && <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="size-4" /></div>}
      </CardHeader>
      <CardContent className="pl-5">
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
      </CardContent>
    </Card>
  );
}
