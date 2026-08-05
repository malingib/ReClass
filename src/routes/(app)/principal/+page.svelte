<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
  const pending = $derived(data.pendingAttendance);
</script>

<DashboardContent title="Principal oversight" subtitle="Remedial coverage, teacher attendance and revenue">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Remedial teachers" value={stats.teachers} sub="On roster" />
    <KpiCard label="Remedial sessions" value={stats.sessions} sub="Active cohorts" />
    <KpiCard label="Teacher attendance" value={`${stats.attendanceRate}%`} sub="Past 14 days" />
    <KpiCard label="Enrolled students" value={stats.students} sub="Linked parents" />
  </div>

  <div class="mt-6 overflow-hidden rounded-xl border border-border bg-white shadow-card">
    <div class="border-b border-border px-5 py-4">
      <h2 class="text-sm font-semibold text-ink-900">Teacher attendance awaiting approval</h2>
      <p class="mt-1 text-xs text-ink-500">Approve verified whole-class session delivery or reject it with a reason.</p>
    </div>
    {#if pending.length === 0}
      <p class="px-5 py-8 text-sm text-ink-400">No attendance is awaiting review.</p>
    {:else}
      <div class="divide-y divide-border">
        {#each pending as attendance}
          <div class="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p class="text-sm font-semibold text-ink-900">{attendance.teachers?.first_name} {attendance.teachers?.last_name} · {attendance.session_occurrences?.class}</p>
              <p class="mt-1 text-xs text-ink-500">
                {attendance.session_occurrences?.sessions?.subjects?.name ?? 'Subject'} · {attendance.session_occurrences?.occurs_on} · {attendance.session_occurrences?.start_time?.slice(0, 5)}–{attendance.session_occurrences?.end_time?.slice(0, 5)} · {attendance.status}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <form method="POST" action="?/review">
                <input type="hidden" name="attendance_id" value={attendance.id} />
                <input type="hidden" name="decision" value="approved" />
                <button class="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">Approve</button>
              </form>
              <form method="POST" action="?/review" class="flex gap-2">
                <input type="hidden" name="attendance_id" value={attendance.id} />
                <input type="hidden" name="decision" value="rejected" />
                <input name="note" required placeholder="Rejection reason" class="w-40 rounded-lg border border-border px-3 py-2 text-xs" />
                <button class="rounded-lg border border-danger/30 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/5">Reject</button>
              </form>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</DashboardContent>
