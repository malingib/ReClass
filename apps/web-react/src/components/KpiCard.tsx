import { Card, CardContent, CardHeader, CardTitle } from './ui';

export function KpiCard({ label, value, icon: Icon, trend }: { label: string; value: string | number; icon?: React.ComponentType<{ className?: string }>; trend?: string }) {
  return (
    <Card className="relative overflow-hidden border-border/80 shadow-none">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-5">
        <CardTitle>{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </CardHeader>
      <CardContent className="pl-5">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
      </CardContent>
    </Card>
  );
}
