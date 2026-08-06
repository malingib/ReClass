<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import DataTable from '$lib/components/DataTable.svelte';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';
  import { cn } from '$lib/utils';

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
  <div class="space-y-8">
    {#if error}
      <Alert variant="destructive" class="border-red-200 bg-red-50">
        <AlertTitle class="text-red-800">Failed to load dashboard</AlertTitle>
        <AlertDescription class="text-red-700">{error}</AlertDescription>
        <Button variant="outline" size="sm" class="mt-4 border-red-300 text-red-700 hover:bg-red-100" onclick={() => window.location.reload()}>
          Try again
        </Button>
      </Alert>
    {:else}
      <!-- KPIs -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="anim-card stagger-1">
          <Card hover class="overflow-hidden">
            <CardContent class="p-6">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-slate-500">Today</p>
                  <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900">{stat.upcomingOccurrences ? 'Active' : '—'}</p>
                  <p class="mt-2 text-sm text-slate-500">{stat.upcomingOccurrences} occurrence{stat.upcomingOccurrences !== 1 ? 's' : ''} today</p>
                </div>
                <div class={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  stat.upcomingOccurrences > 0 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-100 text-slate-500'
                )}>
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="anim-card stagger-2">
          <Card hover class="overflow-hidden">
            <CardContent class="p-6">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-slate-500">Teacher attendance</p>
                  <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900">{stat.attendanceRate}%</p>
                  <p class="mt-2 text-sm text-slate-500">Last 14 days</p>
                </div>
                <div class={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  stat.attendanceRate >= 80 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
                )}>
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="anim-card stagger-3">
          <Card hover class="overflow-hidden">
            <CardContent class="p-6">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-slate-500">M-Pesa collected</p>
                  <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900">KES {(stat.mpesaCollected ?? 0).toLocaleString()}</p>
                  <p class="mt-2 text-sm text-slate-500">{stat.mpesaPayments} receipts</p>
                </div>
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="anim-card stagger-4">
          <Card hover class="overflow-hidden">
            <CardContent class="p-6">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-slate-500">Active sessions</p>
                  <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900">{stat.activeSessions}</p>
                  <p class="mt-2 text-sm text-slate-500">Scheduled</p>
                </div>
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Chart -->
      <div class="anim-card stagger-5">
        <Card hover>
          <CardHeader class="border-b border-slate-100 bg-slate-50/50">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-lg">Remedial session coverage</CardTitle>
                <CardDescription>Sessions scheduled per day over the last 14 days</CardDescription>
              </div>
              <Button variant="ghost" size="sm" href="/admin/scheduling" class="text-slate-600 hover:text-slate-900">
                Open calendar →
              </Button>
            </div>
          </CardHeader>
          <CardContent class="p-6">
            {#if trend.length > 0 && !trendIsAllZero}
              {#if LineChart}
                <LineChart data={trend} unit="sessions" />
              {:else}
                <div class="h-[220px] w-full animate-pulse rounded-xl bg-slate-100"></div>
              {/if}
            {:else}
              <div class="flex flex-col items-center justify-center py-16 text-slate-500">
                <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <p class="text-sm font-semibold text-slate-700">No session data yet</p>
                <p class="mt-1 text-xs text-slate-500">Daily session counts will appear here once sessions are scheduled.</p>
              </div>
            {/if}
          </CardContent>
        </Card>
      </div>

      <!-- Scheduling -->
      <div class="anim-card stagger-6">
        <Card hover>
          <CardHeader class="border-b border-slate-100 bg-slate-50/50">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-lg">Scheduling</CardTitle>
                <CardDescription>{stat.upcomingOccurrences > 0 ? `${stat.upcomingOccurrences} upcoming sessions` : 'No sessions scheduled yet'}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" href="/admin/scheduling" class="text-slate-600 hover:text-slate-900">
                Open calendar →
              </Button>
            </div>
          </CardHeader>
          <CardContent class="p-6">
            {#if stat.upcomingOccurrences > 0}
              <p class="text-sm text-slate-600">Sessions, rooms, and substitutes for the current month. View the full schedule in the calendar view.</p>
            {:else}
              <p class="text-sm text-slate-600">No sessions scheduled yet. Use the <strong class="font-semibold text-slate-900">Scheduling</strong> page to set times for remedial sessions.</p>
            {/if}
          </CardContent>
        </Card>
      </div>

      <!-- Recent payments -->
      <div class="anim-card stagger-7">
        <Card hover>
          <CardHeader class="border-b border-slate-100 bg-slate-50/50">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-lg">Recent parent M-Pesa payments</CardTitle>
              </div>
              <Button variant="ghost" size="sm" href="/admin/parent-payments" class="text-slate-600 hover:text-slate-900">
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
