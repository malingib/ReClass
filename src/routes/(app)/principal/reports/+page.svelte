<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import { Card, CardContent, CardHeader } from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';

  const { data } = $props();
  const stats = $derived(data.stats);
  const recentSessions = $derived(data.recentSessions);
</script>

<DashboardContent title="Reports" subtitle="Teacher attendance and remedial session reports">
  {#snippet headerActions()}
    <Button variant="secondary" onclick={() => window.print()}>Print / PDF</Button>
  {/snippet}
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <KpiCard label="Teacher attendance" value={`${stats.attendanceRate}%`} sub={`${stats.totalAttendance} total marks`} />
    <KpiCard label="Total Students" value={stats.totalStudents} sub="Enrolled in remedial" />
    <KpiCard label="Session occurrences" value={recentSessions.length} sub="Recent records" />
  </div>

  <Card>
    <CardHeader>
      <h3 class="text-sm font-semibold text-foreground">Recent Session Occurrences</h3>
      <p class="mt-1 text-xs text-muted-foreground">Last 10 sessions</p>
    </CardHeader>
    <CardContent class="p-0">
      {#if recentSessions.length === 0}
        <div class="px-6 py-8 text-center text-sm text-muted-foreground">No sessions found yet.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/50">
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Session</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Date</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {#each recentSessions as session, idx}
                <tr class="border-b border-border transition-colors last:border-b-0 hover:bg-muted/50 {idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}">
                  <td class="px-4 py-3 font-medium text-foreground">{session.session_name}</td>
                  <td class="px-4 py-3 text-muted-foreground">
                    {session.occurs_on ? new Date(session.occurs_on).toLocaleDateString() : '—'}
                    {session.start_time ? ` ${session.start_time.slice(0, 5)}` : ''}
                  </td>
                  <td class="px-4 py-3">
                    <Badge variant={session.status === 'done' ? 'default' : session.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </CardContent>
  </Card>
</DashboardContent>
