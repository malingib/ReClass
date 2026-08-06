<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import DataTable from '$lib/components/DataTable.svelte';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';

  const { data } = $props();
  const stat = $derived(data.stat);
  const recentPayments = $derived(data.recentPayments);
  const trend = $derived(data.trend);
  const trendIsAllZero = $derived(trend.length > 0 && trend.every(d => d.value === 0));
  const activity = $derived(data.activity);
  const error = $derived(data.error);

  let LineChart = $state<any>(null);
  $effect(() => {
    import('$lib/components/charts/LineChart.svelte').then(m => { LineChart = m.default; });
  });
</script>

<DashboardContent title="Remedial Operations" subtitle="Scheduling, teacher attendance and parent M-Pesa payments">
  <div class="space-y-6">
    {#if error}
      <Alert variant="destructive">
        <AlertTitle>Failed to load dashboard</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" size="sm" class="mt-4" onclick={() => window.location.reload()}>
          Try again
        </Button>
      </Alert>
    {:else}
      <!-- KPIs -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="anim-card stagger-1">
          <Card>
            <CardContent class="p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-muted-foreground">Today</p>
                  <p class="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stat.upcomingOccurrences ? 'Active' : '—'}</p>
                </div>
                <Badge variant={stat.upcomingOccurrences > 0 ? 'default' : 'secondary'}>
                  {stat.upcomingOccurrences} occurrence{stat.upcomingOccurrences !== 1 ? 's' : ''}
                </Badge>
              </div>
              <p class="mt-3 text-sm text-muted-foreground">{stat.upcomingOccurrences} occurrence{stat.upcomingOccurrences !== 1 ? 's' : ''} today</p>
            </CardContent>
          </Card>
        </div>

        <div class="anim-card stagger-2">
          <Card>
            <CardContent class="p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-muted-foreground">Teacher attendance</p>
                  <p class="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stat.attendanceRate}%</p>
                </div>
                <Badge variant={stat.attendanceRate >= 80 ? 'default' : 'destructive'}>
                  Last 14 days
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="anim-card stagger-3">
          <Card>
            <CardContent class="p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-muted-foreground">M-Pesa collected</p>
                  <p class="mt-2 text-3xl font-semibold tracking-tight text-foreground">KES {(stat.mpesaCollected ?? 0).toLocaleString()}</p>
                </div>
                <Badge variant="secondary">
                  {stat.mpesaPayments} receipts
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="anim-card stagger-4">
          <Card>
            <CardContent class="p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-muted-foreground">Active sessions</p>
                  <p class="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stat.activeSessions}</p>
                </div>
                <Badge variant="outline">Scheduled</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <!-- Chart -->
      <div class="anim-card stagger-5">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>Remedial session coverage</CardTitle>
                <CardDescription>Sessions scheduled per day over the last 14 days</CardDescription>
              </div>
              <Button variant="ghost" size="sm" href="/admin/scheduling">
                Open calendar →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {#if trend.length > 0 && !trendIsAllZero}
              {#if LineChart}
                <LineChart data={trend} unit="sessions" />
              {:else}
                <div class="h-[220px] w-full animate-pulse rounded-xl bg-muted"></div>
              {/if}
            {:else}
              <div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <svg class="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
                </svg>
                <p class="text-sm font-medium">No session data yet</p>
                <p class="text-xs">Daily session counts will appear here once sessions are scheduled.</p>
              </div>
            {/if}
          </CardContent>
        </Card>
      </div>

      <!-- Scheduling -->
      <div class="anim-card stagger-6">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>Scheduling</CardTitle>
                <CardDescription>{stat.upcomingOccurrences > 0 ? `${stat.upcomingOccurrences} upcoming sessions` : 'No sessions scheduled yet'}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" href="/admin/scheduling">
                Open calendar →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {#if stat.upcomingOccurrences > 0}
              <p class="text-sm text-muted-foreground">Sessions, rooms, and substitutes for the current month. View the full schedule in the calendar view.</p>
            {:else}
              <p class="text-sm text-muted-foreground">No sessions scheduled yet. Use the <strong>Scheduling</strong> page to set times for remedial sessions.</p>
            {/if}
          </CardContent>
        </Card>
      </div>

      <!-- Recent payments -->
      <div class="anim-card stagger-7">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>Recent parent M-Pesa payments</CardTitle>
              </div>
              <Button variant="ghost" size="sm" href="/admin/parent-payments">
                View payments →
              </Button>
            </div>
          </CardHeader>
          <CardContent class="p-0">
            <DataTable
              data={recentPayments}
              columns={[
                { key: 'student_name', label: 'Student', sortable: true, render: (r: any) => r.student_name ?? '—' },
                { key: 'amount', label: 'Paid', render: (r: any) => `KES ${Number(r.amount ?? 0).toLocaleString()}` },
                { key: 'channel', label: 'Channel', render: (r: any) => r.domain === 'remedial' ? 'M-Pesa' : (r.method ?? 'Bank') },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <!-- Recent activity -->
      <div class="anim-card stagger-8">
        <RecentActivity activity={activity} />
      </div>
    {/if}
  </div>
</DashboardContent>
