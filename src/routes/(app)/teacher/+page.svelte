<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { EnhancedKpiCard, Skeleton } from '@eshule/shared';
  import { CalendarDays, ClipboardCheck, Users, WalletCards, ArrowRight, Megaphone } from 'lucide-svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
  const today = new Date().toISOString().slice(0, 10);
  const occurrences = $derived((data.occurrences ?? []).filter((o: any) => o.occurs_on <= today));
  const announcements = $derived(data.announcements ?? []);
  const teacher = $derived(data.teacher);
  const remedialRole = $derived(teacher?.remedial_role ?? 'none');
  const isCommittee = $derived(['chairman', 'treasurer', 'member'].includes(remedialRole));
  const loading = $derived(!stats);
  const teacherTypeLabel = $derived(
    data.teacherType === 'remedial' ? 'Remedial teacher'
      : data.teacherType === 'classroom' ? 'Classroom teacher'
      : data.teacherType === 'both' ? 'Remedial & classroom teacher'
      : 'Teacher'
  );
</script>

<DashboardContent title="{teacherTypeLabel} workspace" subtitle="Your responsibilities determine the tools and actions shown here">
  <div class="space-y-7">
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-lg font-semibold text-slate-900">Welcome{teacher?.first_name ? `, ${teacher.first_name}` : ''}</p>
          <p class="mt-1 text-sm text-slate-500">Only actions within your assigned teaching scope are enabled.</p>
        </div>
        {#if isCommittee}
          <a href="/teacher/committee" class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Committee workspace <ArrowRight class="h-4 w-4" />
          </a>
        {/if}
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        {#if data.canRemedial}<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Remedial operations</span>{/if}
        {#if data.canSis}<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">SIS / classroom</span>{/if}
        {#if remedialRole !== 'none'}<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Committee: {remedialRole}</span>{/if}
      </div>
    </section>

    {#if data.canRemedial}
      <section>
        <div class="mb-3 flex items-end justify-between">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">Remedial delivery</h2>
            <p class="mt-1 text-xs text-slate-500">Mark only sessions assigned to you. Approved attendance becomes payroll evidence.</p>
          </div>
          <a href="/teacher/timetable" class="text-xs font-semibold text-primary hover:underline">View timetable</a>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EnhancedKpiCard label="Weekly sessions" value={stats?.sessions ?? 0} sub="Assigned to you" icon="clock" variant="success" {loading} />
          <EnhancedKpiCard label="Pending review" value={stats?.pending ?? 0} sub="Awaiting committee/principal review" icon="chart" variant="amber" {loading} />
        </div>
      </section>

      <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <h2 class="text-sm font-semibold text-slate-900">Sessions requiring delivery confirmation</h2>
          <p class="mt-1 text-xs text-slate-500">After teaching, record present or late. Approved records cannot be changed.</p>
        </div>
        {#if loading}
          <div class="space-y-4 p-5">{#each Array(3) as _}<div class="flex gap-3"><Skeleton class="h-10 w-10 rounded-full" /><div class="flex-1 space-y-2"><Skeleton class="h-4 w-2/3" /><Skeleton class="h-3 w-1/2" /></div></div>{/each}</div>
        {:else if occurrences.length === 0}
          <div class="flex flex-col items-center py-14 text-center"><CalendarDays class="h-9 w-9 text-slate-300" /><p class="mt-3 text-sm font-semibold text-slate-700">No due sessions</p><p class="mt-1 text-xs text-slate-500">Your assigned sessions will appear here when due.</p></div>
        {:else}
          <div class="divide-y divide-slate-100">
            {#each occurrences as occurrence}
              <div class="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">{occurrence.class ?? 'Class'} · {occurrence.subject ?? 'Subject'}</p>
                  <p class="mt-1 text-xs text-slate-500">{new Date(occurrence.occurs_on).toLocaleDateString('en-GB')} · {occurrence.start_time?.slice(0, 5)}–{occurrence.end_time?.slice(0, 5)} · {occurrence.room ?? 'Room not set'}</p>
                  {#if occurrence.attendance}
                    <span class="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold {occurrence.attendance.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">{occurrence.attendance.status} · {occurrence.attendance.approval_status}</span>
                  {/if}
                </div>
                {#if occurrence.attendance?.approval_status !== 'approved'}
                  <div class="flex shrink-0 gap-2">
                    <form method="POST" action="?/mark"><input type="hidden" name="occurrence_id" value={occurrence.id} /><input type="hidden" name="status" value="present" /><button class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Mark present</button></form>
                    <form method="POST" action="?/mark"><input type="hidden" name="occurrence_id" value={occurrence.id} /><input type="hidden" name="status" value="late" /><button class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Mark late</button></form>
                  </div>
                {:else}
                  <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ClipboardCheck class="h-3.5 w-3.5" /> Approved</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    {#if data.canSis}
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">Classroom responsibilities</h2>
            <p class="mt-1 text-xs text-slate-500">Your SIS scope covers assigned classes and their rosters.</p>
          </div>
          <Users class="h-5 w-5 text-blue-500" />
        </div>
        <div class="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-4">
          <div><p class="text-xs uppercase tracking-wide text-slate-400">Homeroom classes</p><p class="mt-1 text-2xl font-bold text-slate-900">{data.homeroomCount ?? 0}</p></div>
          <a href="/teacher/classes" class="text-xs font-semibold text-primary hover:underline">Open my classes</a>
        </div>
      </section>
    {/if}

    {#if isCommittee}
      <section class="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
        <div class="flex items-start gap-3">
          <WalletCards class="mt-0.5 h-5 w-5 text-amber-700" />
          <div class="flex-1"><h2 class="text-sm font-semibold text-slate-900">Committee responsibilities</h2><p class="mt-1 text-xs text-slate-600">Your {remedialRole} hat controls which remedial governance actions are available.</p></div>
          <a href="/teacher/committee" class="text-xs font-semibold text-amber-800 hover:underline">Open</a>
        </div>
      </section>
    {/if}

    {#if announcements.length > 0}
      <section>
        <div class="mb-3 flex items-center gap-2"><Megaphone class="h-4 w-4 text-slate-500" /><h2 class="text-sm font-semibold text-slate-900">Announcements</h2></div>
        <div class="grid gap-3 sm:grid-cols-2">
          {#each announcements as announcement}
            <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div class="flex items-start gap-3"><div class="min-w-0 flex-1"><h3 class="text-sm font-semibold text-slate-900">{announcement.title}</h3><p class="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">{announcement.body}</p></div>{#if announcement.priority === 'urgent'}<span class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Urgent</span>{/if}</div></article>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</DashboardContent>