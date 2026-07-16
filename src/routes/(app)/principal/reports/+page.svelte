<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';

  let { data } = $props();
  let stats = $derived(data.stats);
  let recentSessions = $derived(data.recentSessions);
</script>

<DashboardContent title="Reports" subtitle="Student attendance and academic reports">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Student Attendance" value={`${stats.attendanceRate}%`} sub={`${stats.totalAttendance} total records`} />
    <KpiCard label="Present" value={stats.presentCount} sub="Marked present" />
    <KpiCard label="Late Arrivals" value={stats.lateCount} sub="Arrived late" />
    <KpiCard label="Absences" value={stats.absentCount} sub="Marked absent" />
  </div>

  <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div class="rounded-xl border border-border bg-white p-5 shadow-card">
      <p class="text-sm font-medium text-ink-500">Excused</p>
      <p class="mt-2 text-2xl font-semibold text-ink-900">{stats.excusedCount}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-5 shadow-card">
      <p class="text-sm font-medium text-ink-500">Total Students</p>
      <p class="mt-2 text-2xl font-semibold text-ink-900">{stats.totalStudents}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-5 shadow-card">
      <p class="text-sm font-medium text-ink-500">Records per Student</p>
      <p class="mt-2 text-2xl font-semibold text-ink-900">
        {stats.totalStudents ? (stats.totalAttendance / stats.totalStudents).toFixed(1) : '0'}
      </p>
    </div>
  </div>

  <Card>
    <CardHeader title="Recent Session Occurrences" subtitle="Last 10 sessions">
      {#snippet action()}
        <a href="/principal/approve" class="text-xs font-semibold text-brand-700 hover:text-brand-800">
          Approve attendance
        </a>
      {/snippet}
    </CardHeader>
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
