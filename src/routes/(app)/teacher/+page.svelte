<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import type { Capability } from '$lib/server/_auth/capabilities';

  const { data } = $props();
  const stats = $derived(data.stats);
  const today = new Date().toISOString().slice(0, 10);
  const occurrences = $derived(data.occurrences.filter((occurrence: any) => occurrence.occurs_on <= today));
  const caps = $derived((data.capabilities ?? []) as Capability[]);
  const announcements = $derived(data.announcements);
  const teacherTypeLabel = $derived(
    data.teacherType === 'remedial' ? 'Remedial teacher'
      : data.teacherType === 'classroom' ? 'Classroom teacher'
      : data.teacherType === 'both' ? 'Remedial & classroom teacher'
      : 'Teacher'
  );
</script>

<DashboardContent title={teacherTypeLabel} subtitle="Your scoped workspace in eShule">
  {#if data.canRemedial}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <KpiCard label="Weekly sessions" value={stats.sessions} sub="Assigned to you" />
      <KpiCard label="Pending review" value={stats.pending} sub="Awaiting principal approval" />
    </div>

    <div class="mt-6 overflow-hidden rounded-xl border border-border bg-white shadow-card">
      <div class="border-b border-border px-5 py-4">
        <h2 class="text-sm font-semibold text-ink-900">Recent delivery occurrences</h2>
        <p class="mt-1 text-xs text-ink-500">Submit present or late after teaching the assigned class.</p>
      </div>
      {#if occurrences.length === 0}
        <p class="px-5 py-8 text-sm text-ink-400">No due occurrences to mark.</p>
      {:else}
        <div class="divide-y divide-border">
          {#each occurrences as occurrence}
            <div class="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-ink-900">{occurrence.class} · {occurrence.subject}</p>
                <p class="mt-1 text-xs text-ink-500">{new Date(occurrence.occurs_on).toLocaleDateString()} · {occurrence.start_time.slice(0, 5)}–{occurrence.end_time.slice(0, 5)} · {occurrence.room ?? 'Room not set'}</p>
                {#if occurrence.attendance}
                  <p class="mt-2 text-xs font-medium text-ink-600">
                    {occurrence.attendance.status} · {occurrence.attendance.approval_status}
                    {occurrence.attendance.review_note ? ` · ${occurrence.attendance.review_note}` : ''}
                  </p>
                {/if}
              </div>
              {#if occurrence.attendance?.approval_status !== 'approved'}
                <div class="flex gap-2">
                  <form method="POST" action="?/mark">
                    <input type="hidden" name="occurrence_id" value={occurrence.id} />
                    <input type="hidden" name="status" value="present" />
                    <button class="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">Mark present</button>
                  </form>
                  <form method="POST" action="?/mark">
                    <input type="hidden" name="occurrence_id" value={occurrence.id} />
                    <input type="hidden" name="status" value="late" />
                    <button class="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50">Mark late</button>
                  </form>
                </div>
              {:else}
                <span class="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">Approved</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if announcements.length > 0}
      <div class="mt-6 space-y-3">
        <h3 class="text-sm font-semibold text-slate-900">Announcements</h3>
        {#each announcements as a}
          <div class="rounded-lg border border-slate-200 bg-white p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-slate-900">{a.title}</h4>
                  {#if a.priority === 'urgent'}
                    <span class="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">Urgent</span>
                  {:else if a.priority === 'high'}
                    <span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">High</span>
                  {/if}
                </div>
                <p class="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{a.body}</p>
                {#if a.published_at}
                  <p class="mt-2 text-[11px] text-slate-400">{new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {:else if data.canSis}
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h2 class="text-sm font-semibold text-ink-900">Classroom teacher view</h2>
      <p class="mt-2 text-sm text-ink-500">
        You have classroom (SIS) access. Remedial scheduling and attendance are not assigned to your role.
        Student and class records are available from the Student Information module.
      </p>
    </div>
  {:else}
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h2 class="text-sm font-semibold text-ink-900">No module access assigned</h2>
      <p class="mt-2 text-sm text-ink-500">
        Your teacher profile has no module access. Contact your school administrator to assign
        remedial or classroom access.
      </p>
    </div>
  {/if}
</DashboardContent>
