<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import type { Capability } from '$lib/server/_auth/capabilities';
  import { EnhancedKpiCard, Skeleton } from '@eshule/shared';

  const { data } = $props();
  const stats = $derived(data.stats);
  const today = new Date().toISOString().slice(0, 10);
  const occurrences = $derived(data.occurrences.filter((occurrence: any) => occurrence.occurs_on <= today));
  const caps = $derived((data.capabilities ?? []) as Capability[]);
  const announcements = $derived(data.announcements);
  const loading = $derived(!stats);
  const teacherTypeLabel = $derived(
    data.teacherType === 'remedial' ? 'Remedial teacher'
      : data.teacherType === 'classroom' ? 'Classroom teacher'
      : data.teacherType === 'both' ? 'Remedial & classroom teacher'
      : 'Teacher'
  );
</script>

<DashboardContent title={teacherTypeLabel} subtitle="Your scoped workspace in eShule">
  <div class="space-y-8">
    {#if data.canRemedial}
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div class="anim-card stagger-1">
          <EnhancedKpiCard
            label="Weekly sessions"
            value={stats?.sessions ?? 0}
            sub="Assigned to you"
            icon="clock"
            variant="success"
            {loading}
          />
        </div>
        <div class="anim-card stagger-2">
          <EnhancedKpiCard
            label="Pending review"
            value={stats?.pending ?? 0}
            sub="Awaiting principal approval"
            icon="chart"
            variant="amber"
            {loading}
          />
        </div>
      </div>

      <!-- Occurrences Card -->
      <div class="anim-card stagger-3">
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
                  <Skeleton class="h-8 w-24 rounded-lg" />
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
            <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h2 class="text-base font-semibold text-slate-900">Recent delivery occurrences</h2>
              <p class="mt-1 text-sm text-slate-500">Submit present or late after teaching the assigned class.</p>
            </div>
            {#if occurrences.length === 0}
              <div class="flex flex-col items-center justify-center py-16 text-slate-500">
                <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <p class="text-sm font-semibold text-slate-700">No due occurrences to mark</p>
                <p class="mt-1 text-xs text-slate-500">Your upcoming sessions will appear here.</p>
              </div>
            {:else}
              <div class="divide-y divide-slate-100">
                {#each occurrences as occurrence}
                  <div class="group flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-3">
                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 text-sm font-semibold text-emerald-700 shadow-sm">
                          {occurrence.class?.slice(0, 1) ?? 'C'}
                        </div>
                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold text-slate-900">{occurrence.class} · {occurrence.subject}</p>
                          <p class="mt-0.5 truncate text-xs text-slate-500">{new Date(occurrence.occurs_on).toLocaleDateString()} · {occurrence.start_time.slice(0, 5)}–{occurrence.end_time.slice(0, 5)} · {occurrence.room ?? 'Room not set'}</p>
                        </div>
                      </div>
                      {#if occurrence.attendance}
                        <div class="mt-2 ml-13">
                          <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold {occurrence.attendance.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                            {occurrence.attendance.status} · {occurrence.attendance.approval_status}
                          </span>
                          {#if occurrence.attendance.review_note}
                            <span class="ml-2 text-[11px] text-slate-400">{occurrence.attendance.review_note}</span>
                          {/if}
                        </div>
                      {/if}
                    </div>
                    {#if occurrence.attendance?.approval_status !== 'approved'}
                      <div class="flex gap-2">
                        <form method="POST" action="?/mark">
                          <input type="hidden" name="occurrence_id" value={occurrence.id} />
                          <input type="hidden" name="status" value="present" />
                          <button class="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">Mark present</button>
                        </form>
                        <form method="POST" action="?/mark">
                          <input type="hidden" name="occurrence_id" value={occurrence.id} />
                          <input type="hidden" name="status" value="late" />
                          <button class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50">Mark late</button>
                        </form>
                      </div>
                    {:else}
                      <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Approved
                      </span>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Announcements -->
      {#if announcements.length > 0}
        <div class="anim-card stagger-4 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-slate-900">Announcements</h3>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            {#each announcements as a, i}
              <div class="anim-card group overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]" style:animation-delay="{0.35 + i * 0.05}s">
                <div class="p-5">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <h4 class="text-sm font-semibold text-slate-900">{a.title}</h4>
                        {#if a.priority === 'urgent'}
                          <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Urgent</span>
                        {:else if a.priority === 'high'}
                          <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">High</span>
                        {/if}
                      </div>
                      <p class="mt-2 text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{a.body}</p>
                    </div>
                  </div>
                  {#if a.published_at}
                    <div class="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:else if data.canSis}
      <div class="anim-card stagger-1 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-900">Classroom teacher view</h2>
              <p class="mt-0.5 text-sm text-slate-500">Student Information System access</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
              <p class="text-xs font-medium uppercase tracking-wider text-slate-400">My homeroom classes</p>
              <p class="mt-1 text-2xl font-bold text-slate-900">{data.homeroomCount ?? 0}</p>
            </div>
            <div class="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
              <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Rosters</p>
              <p class="mt-1 text-sm text-slate-600">View class lists under <a href="/teacher/classes" class="font-medium text-primary hover:text-primary/80">My classes</a>.</p>
            </div>
          </div>
          <p class="mt-4 text-sm text-slate-600">
            You have classroom (SIS) access. Remedial scheduling and attendance are not assigned to your role.
            Student and class records are available from the Student Information module.
          </p>
        </div>
      </div>
    {:else}
      <div class="anim-card stagger-1 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-lg shadow-slate-500/25">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-900">No module access assigned</h2>
              <p class="mt-0.5 text-sm text-slate-500">Contact your administrator</p>
            </div>
          </div>
          <p class="text-sm text-slate-600">
            Your teacher profile has no module access. Contact your school administrator to assign
            remedial or classroom access.
          </p>
        </div>
      </div>
    {/if}
  </div>
</DashboardContent>
