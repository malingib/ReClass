<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
  const today = new Date().toISOString().slice(0, 10);
  const occurrences = $derived(data.occurrences.filter((occurrence) => occurrence.occurs_on <= today));
</script>

<DashboardContent title="Remedial teacher workflow" subtitle="Confirm delivery for your whole-class remedial sessions">
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
</DashboardContent>
