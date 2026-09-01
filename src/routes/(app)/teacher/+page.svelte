<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { EnhancedKpiCard } from '@eshule/shared';

  const { data } = $props();
  const today = new Date().toISOString().slice(0, 10);
  const occurrences = $derived((data.occurrences ?? []).filter((o: any) => o.occurs_on === today));
  const upcoming = $derived((data.occurrences ?? []).filter((o: any) => o.occurs_on > today).slice(0, 5));
  const announcements = $derived(data.announcements ?? []);
  const nextClass = $derived(occurrences[0] ?? upcoming[0] ?? null);
  const teacherLabel = $derived(data.teacherType === 'both' ? 'Teacher' : data.teacherType === 'remedial' ? 'Remedial teacher' : 'Classroom teacher');
</script>

<DashboardContent title="Today" subtitle={`${teacherLabel} workspace · focus on what needs doing now`}>
  {#snippet headerActions()}
    <a href="/teacher/timetable" class="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">View timetable</a>
    <a href="/teacher/classes" class="inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30">My classes</a>
  {/snippet}

  <div class="space-y-6">
    <section aria-labelledby="next-class-heading" class="rounded-2xl border border-primary/15 bg-primary/5 p-5 shadow-sm sm:p-6">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">{nextClass ? (nextClass.occurs_on === today ? 'Next up today' : 'Next scheduled') : 'Your day'}</p>
          <h2 id="next-class-heading" class="mt-1 text-xl font-bold text-slate-950">{nextClass ? `${nextClass.class ?? 'Class'} · ${nextClass.subject ?? 'Lesson'}` : 'No class scheduled'}</h2>
          <p class="mt-1 text-sm text-slate-600">{nextClass ? `${nextClass.start_time?.slice(0,5) ?? ''}–${nextClass.end_time?.slice(0,5) ?? ''} · ${nextClass.room ?? 'Room not set'}` : 'Use your timetable to plan your teaching day.'}</p>
        </div>
        {#if nextClass && nextClass.occurs_on === today && data.canRemedial}
          {#if nextClass.attendance?.approval_status === 'approved'}
            <span class="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-100 px-4 text-sm font-semibold text-emerald-700" aria-label="Class delivery approved">Approved</span>
          {:else}
            <div class="flex gap-2">
              <form method="POST" action="?/mark"><input type="hidden" name="occurrence_id" value={nextClass.id} /><input type="hidden" name="status" value="present" /><button type="submit" class="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">Mark present</button></form>
              <form method="POST" action="?/mark"><input type="hidden" name="occurrence_id" value={nextClass.id} /><input type="hidden" name="status" value="late" /><button type="submit" class="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">Mark late</button></form>
            </div>
          {/if}
        {/if}
      </div>
    </section>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <EnhancedKpiCard label="Sessions this week" value={data.stats?.sessions ?? 0} sub="Assigned to you" icon="clock" variant="success" />
      <EnhancedKpiCard label="Pending review" value={data.stats?.pending ?? 0} sub="Needs principal action" icon="chart" variant="amber" />
      <EnhancedKpiCard label="Homerooms" value={data.homeroomCount ?? 0} sub="Your classroom groups" icon="users" variant="info" />
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <section aria-labelledby="today-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-5 py-4"><h2 id="today-heading" class="text-base font-bold text-slate-900">Today’s classes</h2><p class="mt-1 text-sm text-slate-500">Complete the teaching task, then record delivery.</p></div>
        {#if occurrences.length === 0}
          <div class="px-5 py-12 text-center"><div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400" aria-hidden="true">✓</div><p class="mt-3 text-sm font-semibold text-slate-700">Nothing scheduled today</p><p class="mt-1 text-xs text-slate-500">You’re all caught up. Check your timetable for upcoming classes.</p></div>
        {:else}
          <div class="divide-y divide-slate-100">
            {#each occurrences as occurrence}
              <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0"><p class="truncate text-sm font-semibold text-slate-900">{occurrence.class ?? 'Class'} · {occurrence.subject ?? 'Lesson'}</p><p class="mt-1 text-xs text-slate-500">{occurrence.start_time?.slice(0,5)}–{occurrence.end_time?.slice(0,5)} · {occurrence.room ?? 'Room not set'}</p></div>
                {#if occurrence.attendance?.approval_status === 'approved'}<span class="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Approved</span>{:else}<span class="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Delivery to record</span>{/if}
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <aside aria-labelledby="actions-heading" class="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <h2 id="actions-heading" class="text-base font-bold text-slate-900">Quick actions</h2>
        <div class="mt-4 grid gap-2">
          <a href="/teacher/classes" class="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">Open my classes <span aria-hidden="true">→</span></a>
          <a href="/teacher/timetable" class="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">Check timetable <span aria-hidden="true">→</span></a>
          {#if data.canRemedial}<a href="/remedial" class="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">Open ReClass <span aria-hidden="true">→</span></a>{/if}
        </div>
      </aside>
    </div>

    {#if upcoming.length > 0}
      <section aria-labelledby="upcoming-heading" class="rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-5 py-4"><h2 id="upcoming-heading" class="text-base font-bold text-slate-900">Coming up</h2></div>
        <div class="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">{#each upcoming as item}<div class="rounded-lg border border-slate-100 bg-slate-50/60 p-4"><p class="text-xs font-semibold text-primary">{item.occurs_on}</p><p class="mt-1 text-sm font-semibold text-slate-900">{item.class ?? 'Class'} · {item.subject ?? 'Lesson'}</p><p class="mt-1 text-xs text-slate-500">{item.start_time?.slice(0,5)}–{item.end_time?.slice(0,5)}</p></div>{/each}</div>
      </section>
    {/if}

    {#if announcements.length > 0}
      <section aria-labelledby="announcements-heading"><div class="flex items-center justify-between"><h2 id="announcements-heading" class="text-base font-bold text-slate-900">School updates</h2><a href="/notifications" class="text-sm font-semibold text-primary hover:underline">View all</a></div><div class="mt-3 grid gap-3 sm:grid-cols-2">{#each announcements.slice(0,2) as a}<article class="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm"><div class="flex items-center gap-2"><h3 class="text-sm font-semibold text-slate-900">{a.title}</h3>{#if a.priority === 'urgent'}<span class="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Urgent</span>{/if}</div><p class="mt-2 line-clamp-2 text-sm text-slate-600">{a.body}</p></article>{/each}</div></section>
    {/if}
  </div>
</DashboardContent>
