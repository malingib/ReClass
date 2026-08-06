<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import { Card, CardContent, CardHeader } from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';

  const { data } = $props();
  const stats = $derived(data.stats);
  const pending = $derived(data.pendingAttendance);
</script>

<DashboardContent title="Principal oversight" subtitle="Remedial coverage, teacher attendance and revenue">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div class="anim-card stagger-1"><KpiCard label="Remedial teachers" value={stats.teachers} sub="On roster" /></div>
    <div class="anim-card stagger-2"><KpiCard label="Remedial sessions" value={stats.sessions} sub="Active cohorts" /></div>
    <div class="anim-card stagger-3"><KpiCard label="Teacher attendance" value={`${stats.attendanceRate}%`} sub="Past 14 days" /></div>
    <div class="anim-card stagger-4"><KpiCard label="Enrolled students" value={stats.students} sub="Linked parents" /></div>
  </div>

  <Card class="anim-card stagger-5 mt-6">
    <CardHeader>
      <h2 class="text-sm font-semibold text-foreground">Teacher attendance awaiting approval</h2>
      <p class="mt-1 text-xs text-muted-foreground">Approve verified whole-class session delivery or reject it with a reason.</p>
    </CardHeader>
    <CardContent class="p-0">
      {#if pending.length === 0}
        <p class="px-5 py-8 text-sm text-muted-foreground">No attendance is awaiting review.</p>
      {:else}
        <div class="divide-y divide-border">
          {#each pending as attendance}
            <div class="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p class="text-sm font-semibold text-foreground">{attendance.teachers?.first_name} {attendance.teachers?.last_name} · {attendance.session_occurrences?.class}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {attendance.session_occurrences?.sessions?.subjects?.name ?? 'Subject'} · {attendance.session_occurrences?.occurs_on} · {attendance.session_occurrences?.start_time?.slice(0, 5)}–{attendance.session_occurrences?.end_time?.slice(0, 5)} · {attendance.status}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <form method="POST" action="?/review">
                  <input type="hidden" name="attendance_id" value={attendance.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <Button type="submit" size="sm">Approve</Button>
                </form>
                <form method="POST" action="?/review" class="flex gap-2">
                  <input type="hidden" name="attendance_id" value={attendance.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <input name="note" required placeholder="Rejection reason" class="w-40 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                  <Button type="submit" size="sm" variant="destructive">Reject</Button>
                </form>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </CardContent>
  </Card>
</DashboardContent>
