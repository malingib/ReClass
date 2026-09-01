<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { EnhancedKpiCard } from '@eshule/shared';
  import { Button } from '$lib/components/ui/button/index.js';

  const { data } = $props();
  const stats = $derived(data.stats ?? {});
  const pending = $derived(data.pendingAttendance ?? []);
</script>

<DashboardContent title="Principal Command Center" subtitle="See what needs attention across the school and act quickly">
  {#snippet headerActions()}
    <Button href="/principal/school" variant="outline" size="sm">School overview</Button>
    <Button href="/notifications" size="sm">Send update</Button>
  {/snippet}

  <div class="space-y-6">
    <section aria-labelledby="command-heading" class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Leadership focus</p><h2 id="command-heading" class="mt-1 text-xl font-bold text-slate-950">Good morning. Here’s what needs your attention.</h2><p class="mt-1 text-sm text-slate-500">Review exceptions first, then move into school-wide operations.</p></div>
        <a href="/principal/school" class="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30">Open school overview <span aria-hidden="true" class="ml-1">→</span></a>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <EnhancedKpiCard label="Students" value={stats.students ?? 0} sub="Active enrolment" icon="students" variant="info" />
      <EnhancedKpiCard label="Teachers" value={stats.teachers ?? 0} sub="On roster" icon="users" variant="purple" />
      <EnhancedKpiCard label="Attendance" value={`${stats.attendanceRate ?? 0}%`} sub="Recent reporting period" icon="check" variant="success" />
      <EnhancedKpiCard label="Sessions" value={stats.sessions ?? 0} sub="Active programme sessions" icon="clock" variant="amber" />
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <section aria-labelledby="approvals-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="approvals-heading" class="text-base font-bold text-slate-900">Approvals queue</h2><p class="mt-1 text-sm text-slate-500">Items requiring a principal decision.</p></div><span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">{pending.length} pending</span></div>
        {#if pending.length === 0}
          <div class="px-5 py-12 text-center"><div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600" aria-hidden="true">✓</div><p class="mt-3 text-sm font-semibold text-slate-700">No approvals waiting</p><p class="mt-1 text-xs text-slate-500">Your queue is clear.</p></div>
        {:else}
          <div class="divide-y divide-slate-100">{#each pending as attendance}<div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div class="min-w-0"><p class="truncate text-sm font-semibold text-slate-900">{attendance.teachers?.first_name} {attendance.teachers?.last_name} · {attendance.session_occurrences?.class}</p><p class="mt-1 text-xs text-slate-500">{attendance.session_occurrences?.sessions?.subjects?.name ?? 'Session'} · {attendance.session_occurrences?.occurs_on} · {attendance.session_occurrences?.start_time?.slice(0,5)}</p></div><div class="flex gap-2"><form method="POST" action="?/review"><input type="hidden" name="attendance_id" value={attendance.id}/><input type="hidden" name="decision" value="approved"/><Button type="submit" size="sm" class="bg-emerald-600 hover:bg-emerald-700">Approve</Button></form><form method="POST" action="?/review" class="flex gap-2"><input type="hidden" name="attendance_id" value={attendance.id}/><input type="hidden" name="decision" value="rejected"/><label class="sr-only" for={`reject-${attendance.id}`}>Reason for rejection</label><input id={`reject-${attendance.id}`} name="note" required placeholder="Reason" class="min-h-9 w-28 rounded-lg border border-slate-200 px-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"/><Button type="submit" size="sm" variant="destructive">Reject</Button></form></div></div>{/each}</div>
        {/if}
      </section>

      <aside aria-labelledby="actions-heading" class="rounded-xl border border-slate-200/70 bg-slate-950 p-5 text-white shadow-sm">
        <h2 id="actions-heading" class="text-base font-bold">Leadership actions</h2><p class="mt-1 text-sm text-slate-300">Jump straight to common decisions.</p>
        <div class="mt-4 grid gap-2">
          <a href="/principal/school" class="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40">Review school performance <span aria-hidden="true">→</span></a>
          <a href="/admin/students" class="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40">Review students <span aria-hidden="true">→</span></a>
          <a href="/bursar" class="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40">Open finance <span aria-hidden="true">→</span></a>
          <a href="/admin/modules" class="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40">Open programme modules <span aria-hidden="true">→</span></a>
        </div>
      </aside>
    </div>

    <section aria-labelledby="glance-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="glance-heading" class="text-base font-bold text-slate-900">School at a glance</h2><p class="mt-1 text-sm text-slate-500">Student Information System snapshot.</p></div><a href="/principal/school" class="text-sm font-semibold text-primary hover:underline">Full overview <span aria-hidden="true">→</span></a></div><div class="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div class="p-5"><p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Classes</p><p class="mt-1 text-2xl font-bold text-slate-900">{data.sis?.classes ?? data.sis?.activeClasses ?? 0}</p></div><div class="p-5"><p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Admissions</p><p class="mt-1 text-2xl font-bold text-slate-900">{data.sis?.admissions ?? data.sis?.recentAdmissions ?? 0}</p></div><div class="p-5"><p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Active enrolments</p><p class="mt-1 text-2xl font-bold text-slate-900">{data.sis?.enrollments ?? data.sis?.totalEnrollments ?? 0}</p></div></div></section>
  </div>
</DashboardContent>
