<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { CalendarDays, CheckCircle2, ClipboardCheck, Megaphone, Users, WalletCards, ArrowRight } from 'lucide-svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
  const teacher = $derived(data.teacher);
  const occurrences = $derived(data.occurrences ?? []);
  const announcements = $derived(data.announcements ?? []);
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = $derived(occurrences.filter((o: any) => o.occurs_on === today));
  const dueSessions = $derived(todaySessions.filter((o: any) => o.attendance?.approval_status !== 'approved'));
  const nextSession = $derived(todaySessions.find((o: any) => o.start_time >= new Date().toTimeString().slice(0, 8)) ?? todaySessions[0] ?? null);
  const remedialRole = $derived(teacher?.remedial_role ?? 'none');
  const isCommittee = $derived(['chairman', 'treasurer', 'member'].includes(remedialRole));
  const teacherTypeLabel = $derived(data.teacherType === 'remedial' ? 'Remedial teacher' : data.teacherType === 'classroom' ? 'Classroom teacher' : data.teacherType === 'both' ? 'Remedial & classroom teacher' : 'Teacher');
  const time = (value: string | null | undefined) => value?.slice(0, 5) ?? '—';
</script>

<svelte:head><title>Teacher workspace · eShule</title><meta name="description" content="Your teaching day, sessions, attendance and responsibilities in eShule." /></svelte:head>

<DashboardContent title="{teacherTypeLabel} workspace" subtitle="Your day is organized around the work assigned to you.">
  <div class="space-y-7">
    <section class="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-white p-6 shadow-card sm:p-8">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">Today</p><h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">Good morning{teacher?.first_name ? `, ${teacher.first_name}` : ''}.</h1><p class="mt-3 max-w-xl text-sm leading-6 text-ink-500">Start with your next session, then clear the attendance tasks waiting for you.</p></div>
        {#if dueSessions.length > 0}<a href="#attendance" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Confirm attendance <ArrowRight class="h-4 w-4" /></a>{:else}<span class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 class="h-4 w-4" /> No attendance due</span>{/if}
      </div>
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">Today's sessions</p><p class="mt-1 text-2xl font-bold text-ink-900">{todaySessions.length}</p></div>
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">Pending review</p><p class="mt-1 text-2xl font-bold text-ink-900">{stats?.pending ?? 0}</p></div>
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">Homeroom classes</p><p class="mt-1 text-2xl font-bold text-ink-900">{data.homeroomCount ?? 0}</p></div>
      </div>
    </section>

    {#if nextSession}
      <section class="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Next session</p><h2 class="mt-1 text-xl font-semibold text-ink-900">{nextSession.subject || 'Session'} · {nextSession.class ?? 'Class'}</h2><p class="mt-1 text-sm text-ink-500">{time(nextSession.start_time)}–{time(nextSession.end_time)} · {nextSession.room ?? 'Room not set'}</p></div>
          <a href="/teacher/timetable" class="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">Open timetable <ArrowRight class="h-4 w-4" /></a>
        </div>
      </section>
    {/if}

    {#if data.canRemedial}
      <section id="attendance" class="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
        <div class="flex flex-col gap-2 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 class="text-lg font-semibold text-ink-900">Your sessions</h2><p class="mt-1 text-sm text-ink-400">After teaching, record present or late. Approved records become payroll evidence.</p></div><a href="/teacher/timetable" class="text-xs font-semibold text-primary hover:underline">Full timetable →</a></div>
        {#if todaySessions.length === 0}<div class="p-10 text-center"><CalendarDays class="mx-auto h-8 w-8 text-ink-300" /><p class="mt-3 text-sm font-semibold text-ink-700">No sessions today</p><p class="mt-1 text-xs text-ink-400">Your next assigned session will appear here when scheduled.</p></div>
        {:else}<div class="divide-y divide-border/60">
          {#each todaySessions as occurrence}
            <div class="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div class="min-w-0"><p class="truncate text-sm font-semibold text-ink-900">{occurrence.subject || 'Subject'} · {occurrence.class ?? 'Class'}</p><p class="mt-1 text-xs text-ink-500">{time(occurrence.start_time)}–{time(occurrence.end_time)} · {occurrence.room ?? 'Room not set'}</p>{#if occurrence.attendance}<span class="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold {occurrence.attendance.approval_status === 'approved' ? 'bg-emerald-50 text-emerald-700' : occurrence.attendance.status === 'late' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}">{occurrence.attendance.status} · {occurrence.attendance.approval_status}</span>{/if}</div>
              {#if occurrence.attendance?.approval_status !== 'approved'}<div class="flex w-full gap-2 sm:w-auto"><form method="POST" action="?/mark" class="flex-1 sm:flex-none"><input type="hidden" name="occurrence_id" value={occurrence.id} /><input type="hidden" name="status" value="present" /><button class="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-white hover:bg-primary/90">Present</button></form><form method="POST" action="?/mark" class="flex-1 sm:flex-none"><input type="hidden" name="occurrence_id" value={occurrence.id} /><input type="hidden" name="status" value="late" /><button class="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-xs font-semibold text-ink-700 hover:bg-slate-50">Late</button></form></div>{:else}<span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><ClipboardCheck class="h-3.5 w-3.5" /> Approved</span>{/if}
            </div>
          {/each}
        </div>{/if}
      </section>
    {/if}

    <div class="grid gap-4 sm:grid-cols-2">
      {#if data.canSis}<a href="/teacher/classes" class="group rounded-2xl border border-border/60 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov"><div class="flex items-center justify-between"><Users class="h-5 w-5 text-primary" /><ArrowRight class="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-primary" /></div><h2 class="mt-4 text-sm font-semibold text-ink-900">My classes</h2><p class="mt-1 text-xs leading-5 text-ink-500">Open the rosters and classroom responsibilities assigned to you.</p></a>{/if}
      {#if isCommittee}<a href="/teacher/committee" class="group rounded-2xl border border-amber-200 bg-amber-50/60 p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div class="flex items-center justify-between"><WalletCards class="h-5 w-5 text-amber-700" /><ArrowRight class="h-4 w-4 text-amber-500" /></div><h2 class="mt-4 text-sm font-semibold text-ink-900">Committee responsibilities</h2><p class="mt-1 text-xs leading-5 text-ink-600">Your {remedialRole} role controls the governance actions available to you.</p></a>{/if}
    </div>

    {#if announcements.length > 0}<section><div class="mb-4 flex items-center gap-2"><Megaphone class="h-5 w-5 text-primary" /><div><h2 class="text-lg font-semibold text-ink-900">Announcements</h2><p class="mt-1 text-sm text-ink-400">Important updates from your school.</p></div></div><div class="grid gap-4 sm:grid-cols-2">{#each announcements.slice(0, 4) as announcement}<article class="rounded-2xl border border-border/60 bg-white p-5 shadow-card"><div class="flex items-start justify-between gap-3"><h3 class="text-sm font-semibold text-ink-900">{announcement.title}</h3>{#if announcement.priority === 'urgent'}<span class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Urgent</span>{/if}</div><p class="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-5 text-ink-500">{announcement.body}</p></article>{/each}</div></section>{/if}
  </div>
</DashboardContent>
