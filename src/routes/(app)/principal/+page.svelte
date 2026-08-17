<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { EnhancedKpiCard, Skeleton } from '@eshule/shared';

  const { data } = $props();
  const stats = $derived(data.stats);
  const pending = $derived(data.pendingAttendance);
  const loading = $derived(!stats);
</script>

<DashboardContent title="Principal oversight" subtitle="Remedial coverage, teacher attendance and revenue">
  <div class="space-y-8">
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div class="anim-card stagger-1">
        <EnhancedKpiCard
          label="Remedial teachers"
          value={stats?.teachers ?? 0}
          sub="On roster"
          icon="users"
          variant="info"
          {loading}
        />
      </div>
      <div class="anim-card stagger-2">
        <EnhancedKpiCard
          label="Remedial sessions"
          value={stats?.sessions ?? 0}
          sub="Active cohorts"
          icon="clock"
          variant="success"
          {loading}
        />
      </div>
      <div class="anim-card stagger-3">
        <EnhancedKpiCard
          label="Teacher attendance"
          value={`${stats?.attendanceRate ?? 0}%`}
          sub="Past 14 days"
          icon="check"
          variant="purple"
          {loading}
        />
      </div>
      <div class="anim-card stagger-4">
        <EnhancedKpiCard
          label="Enrolled students"
          value={stats?.students ?? 0}
          sub="Linked parents"
          icon="students"
          variant="amber"
          {loading}
        />
      </div>
    </div>

    <!-- School at a glance (SIS, read-only) -->
    <div class="anim-card stagger-5">
      <div class="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">School at a glance</h2>
            <p class="mt-1 text-sm text-slate-500">School-wide student information, read-only.</p>
          </div>
          <a href="/principal/school" class="text-sm font-medium text-primary hover:text-primary/80">Full overview →</a>
        </div>
        <div class="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div class="px-6 py-5">
            <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Classes</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">{data.sis?.classes ?? 0}</p>
          </div>
          <div class="px-6 py-5">
            <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Admissions</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">{data.sis?.admissions ?? 0}</p>
          </div>
          <div class="px-6 py-5">
            <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Active enrollments</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">{data.sis?.enrollments ?? 0}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Pending Attendance Card -->
    <div class="anim-card stagger-6">
      {#if loading}
        <div class="rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
          <div class="border-b border-slate-100 bg-slate-50/50 p-6">
            <Skeleton class="h-5 w-48" />
            <Skeleton class="mt-2 h-3 w-64" />
          </div>
          <div class="p-6 space-y-4">
            {#each Array(3) as _}
              <div class="flex items-center gap-4">
                <Skeleton class="h-10 w-10 rounded-full shrink-0" />
                <div class="flex-1 space-y-2">
                  <Skeleton class="h-4 w-3/4" />
                  <Skeleton class="h-3 w-1/2" />
                </div>
                <Skeleton class="h-8 w-20 rounded-lg" />
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
          <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <h2 class="text-base font-semibold text-slate-900">Teacher attendance awaiting approval</h2>
            <p class="mt-1 text-sm text-slate-500">Approve verified whole-class session delivery or reject it with a reason.</p>
          </div>
          {#if pending.length === 0}
            <div class="flex flex-col items-center justify-center py-16 text-slate-500">
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-sm font-semibold text-slate-700">No attendance awaiting review</p>
              <p class="mt-1 text-xs text-slate-500">All caught up! Check back later for new submissions.</p>
            </div>
          {:else}
            <div class="divide-y divide-slate-100">
              {#each pending as attendance}
                <div class="group flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-sm font-semibold text-blue-700 shadow-sm">
                        {attendance.teachers?.first_name?.slice(0, 1) ?? 'T'}
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-slate-900">{attendance.teachers?.first_name} {attendance.teachers?.last_name} · {attendance.session_occurrences?.class}</p>
                        <p class="mt-0.5 truncate text-xs text-slate-500">
                          {attendance.session_occurrences?.sessions?.subjects?.name ?? 'Subject'} · {attendance.session_occurrences?.occurs_on} · {attendance.session_occurrences?.start_time?.slice(0, 5)}–{attendance.session_occurrences?.end_time?.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <form method="POST" action="?/review">
                      <input type="hidden" name="attendance_id" value={attendance.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <Button type="submit" size="sm" class="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                    </form>
                    <form method="POST" action="?/review" class="flex gap-2">
                      <input type="hidden" name="attendance_id" value={attendance.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input name="note" required placeholder="Rejection reason" class="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20" />
                      <Button type="submit" size="sm" variant="destructive">Reject</Button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</DashboardContent>
