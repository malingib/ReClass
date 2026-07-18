<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { enhance } from '$app/forms';

  const { data, form } = $props();
  const pending = $derived(data.pending);
  const pendingCount = $derived(data.pendingCount);

  let selected = $state<Set<string>>(new Set());
  let approving = $state(false);

  function toggleAll() {
    if (selected.size === pending.length) {
      selected = new Set();
    } else {
      selected = new Set(pending.map((r: any) => r.id));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function statusBadge(s: string) {
    const map: Record<string, string> = {
      present: 'bg-brand-50 text-brand-700',
      late: 'bg-warning/10 text-warning',
      absent: 'bg-danger/10 text-danger',
      excused: 'bg-ink-100 text-ink-600',
    };
    return map[s] ?? 'bg-ink-100 text-ink-600';
  }
</script>

<DashboardContent title="Attendance Approval" subtitle="Review and lock student attendance records">
  {#snippet headerActions()}
    <form method="POST" action="?/approve" use:enhance={() => { approving = true; }}>
      <input type="hidden" name="ids" value={JSON.stringify([...selected])} />
      <Button
        type="submit"
        variant="primary"
        disabled={selected.size === 0}
        loading={approving}
      >
        Approve & Lock ({selected.size})
      </Button>
    </form>
  {/snippet}

  {#if form?.success}
    <div class="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
      Successfully approved and locked {form.count} record{form.count !== 1 ? 's' : ''}.
    </div>
  {/if}
  {#if form?.error}
    <div class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  <div class="overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-card backdrop-blur-sm">
    {#if pending.length === 0}
      <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-sm text-ink-500">All attendance records are approved and locked.</p>
        <p class="text-xs text-ink-400">{pendingCount} pending records</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border/70 bg-ink-50/70">
              <th class="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === pending.length && pending.length > 0}
                  indeterminate={selected.size > 0 && selected.size < pending.length}
                  onchange={toggleAll}
                  class="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Student</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Adm No</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Session</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Date</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each pending as record, idx}
              <tr class="border-b border-border/70 transition-colors last:border-b-0 hover:bg-brand-50/40 {idx % 2 === 0 ? 'bg-white/60' : 'bg-ink-50/40'}">
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(record.id)}
                    onchange={() => toggleOne(record.id)}
                    class="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td class="px-4 py-3 font-medium text-ink-800">{record.student_name}</td>
                <td class="px-4 py-3 text-ink-500">{record.admission_no}</td>
                <td class="px-4 py-3 text-ink-700">
                  <span class="block">{record.session_name}</span>
                  <span class="text-xs text-ink-400">{record.slot}</span>
                </td>
                <td class="px-4 py-3 text-ink-600">
                  {record.occurs_on ? new Date(record.occurs_on).toLocaleDateString() : '—'}
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide {statusBadge(record.status)}">
                    {record.status}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t border-border/70 bg-ink-50/50 px-4 py-3">
        <p class="text-xs text-ink-400">{pending.length} pending record{pending.length !== 1 ? 's' : ''}</p>
        <p class="text-xs font-medium text-ink-500">{selected.size} selected</p>
      </div>
    {/if}
  </div>
</DashboardContent>
