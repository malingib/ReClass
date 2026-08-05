<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import Button from '$lib/components/ui/button.svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
  const recentSessions = $derived(data.recentSessions);
</script>

<DashboardContent title="Reports" subtitle="Teacher attendance and remedial session reports">
  {#snippet headerActions()}
    <Button variant="secondary" size="sm" onclick={() => window.print()}>Print / PDF</Button>
  {/snippet}
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <KpiCard label="Teacher attendance" value={`${stats.attendanceRate}%`} sub={`${stats.totalAttendance} total marks`} />
    <KpiCard label="Total Students" value={stats.totalStudents} sub="Enrolled in remedial" />
    <KpiCard label="Session occurrences" value={recentSessions.length} sub="Recent records" />
  </div>

  <Card>
    <CardHeader title="Recent Session Occurrences" subtitle="Last 10 sessions" />
    <CardContent class="!p-0">
      {#if recentSessions.length === 0}
        <div class="px-6 py-8 text-center text-sm text-ink-500">No sessions found yet.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border/70 bg-ink-50/70">
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Session</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Date</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {#each recentSessions as session, idx}
                <tr class="border-b border-border/70 transition-colors last:border-b-0 hover:bg-brand-50/40 {idx % 2 === 0 ? 'bg-white/60' : 'bg-ink-50/40'}">
                  <td class="px-4 py-3 font-medium text-ink-800">{session.session_name}</td>
                  <td class="px-4 py-3 text-ink-600">
                    {session.occurs_on ? new Date(session.occurs_on).toLocaleDateString() : '—'}
                    {session.start_time ? ` ${session.start_time.slice(0, 5)}` : ''}
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide {session.status === 'done' ? 'bg-brand-50 text-brand-700' : session.status === 'cancelled' ? 'bg-danger/10 text-danger' : 'bg-ink-100 text-ink-600'}">
                      {session.status}
                    </span>
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
