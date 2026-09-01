<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { EnhancedKpiCard } from '@eshule/shared';
  const { data } = $props();
  const today = new Date().toISOString().slice(0, 10);
  const occurrences = $derived((data.occurrences ?? []).filter((o: any) => o.occurs_on === today));
  const upcoming = $derived((data.occurrences ?? []).filter((o: any) => o.occurs_on > today).slice(0, 5));
  const nextClass = $derived(occurrences[0] ?? upcoming[0] ?? null);
  const teacherLabel = $derived(data.teacherType === 'both' ? 'Teacher' : data.teacherType === 'remedial' ? 'Remedial teacher' : 'Classroom teacher');
</script>
<DashboardContent title="Today" subtitle={`${teacherLabel} workspace · record your attendance`}>
  {#snippet headerActions()}<a href="/teacher/timetable" class="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">View timetable</a>{/snippet}
  <div class="space-y-6">
    <section class="rounded-2xl border border-primary/15 bg-primary/5 p-5 shadow-sm sm:p-6" aria-labelledby="attendance-heading">
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Teacher attendance</p><h2 id="attendance-heading" class="mt-1 text-xl font-bold text-slate-950">{nextClass ? `${nextClass.class ?? 'Class'} · ${nextClass.subject ?? 'Lesson'}` : 'No class scheduled'}</h2>
      <p class="mt-1 text-sm text-slate-600">{nextClass ? `${nextClass.start_time?.slice(0,5) ?? ''}–${nextClass.end_time?.slice(0,5) ?? ''} · ${nextClass.room ?? 'Room not set'}` : 'Check your timetable for upcoming sessions.'}</p>
      {#if nextClass && nextClass.occurs_on === today}
        {#if nextClass.attendance?.approval_status === 'approved'}<span class="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">Attendance approved</span>
        {:else if nextClass.attendance?.approval_status === 'pending'}<span class="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-700">Awaiting committee approval</span>
        {:else}<div class="mt-4 flex flex-wrap gap-2"><form method="POST" action="?/mark"><input type="hidden" name="occurrence_id" value={nextClass.id}/><input type="hidden" name="status" value="attended"/><button type="submit" class="min-h-11 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white">Attended</button></form><form method="POST" action="?/mark"><input type="hidden" name="occurrence_id" value={nextClass.id}/><input type="hidden" name="status" value="absent"/><button type="submit" class="min-h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">Absent</button></form></div>{/if}
      {/if}
    </section>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3"><EnhancedKpiCard label="Sessions this week" value={data.stats?.sessions ?? 0} sub="Assigned to you" icon="clock" variant="success"/><EnhancedKpiCard label="Pending approval" value={data.stats?.pending ?? 0} sub="Committee review" icon="chart" variant="amber"/><EnhancedKpiCard label="Homerooms" value={data.homeroomCount ?? 0} sub="Your classroom groups" icon="users" variant="info"/></div>
    {#if occurrences.length}<section class="rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><h2 class="text-base font-bold text-slate-900">Today's attendance</h2><p class="mt-1 text-sm text-slate-500">Only two attendance outcomes are available.</p></div><div class="divide-y divide-slate-100">{#each occurrences as occurrence}<div class="flex items-center justify-between gap-4 px-5 py-4"><div><p class="text-sm font-semibold text-slate-900">{occurrence.class ?? 'Class'} · {occurrence.subject ?? 'Lesson'}</p><p class="text-xs text-slate-500">{occurrence.start_time?.slice(0,5)}–{occurrence.end_time?.slice(0,5)}</p></div><span class="rounded-full px-3 py-1 text-xs font-bold {occurrence.attendance?.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : occurrence.attendance?.approval_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}">{occurrence.attendance?.approval_status === 'approved' ? 'Approved' : occurrence.attendance?.approval_status === 'pending' ? 'Pending' : 'Not marked'}</span></div>{/each}</div></section>{/if}
    {#if upcoming.length}<section><h2 class="text-base font-bold text-slate-900">Coming up</h2><div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{#each upcoming as item}<div class="rounded-lg border border-slate-100 bg-white p-4"><p class="text-xs font-semibold text-primary">{item.occurs_on}</p><p class="mt-1 text-sm font-semibold">{item.class ?? 'Class'} · {item.subject ?? 'Lesson'}</p><p class="mt-1 text-xs text-slate-500">{item.start_time?.slice(0,5)}–{item.end_time?.slice(0,5)}</p></div>{/each}</div></section>{/if}
  </div>
</DashboardContent>
