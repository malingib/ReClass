<script lang="ts">
  import { enhance } from '$app/forms';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data, form } = $props();
  let payroll = $derived(data.payroll);
  let teachers = $derived(data.teachers);

  let periodStart = $state('');
  let periodEnd = $state('');
  let showGenerator = $state(false);
  let generating = $state(false);

  function statusBadge(s: string) {
    const map: Record<string, string> = {
      draft: 'bg-ink-100 text-ink-600',
      approved: 'bg-brand-50 text-brand-700',
      paid: 'bg-success/10 text-success',
    };
    return map[s] ?? 'bg-ink-100 text-ink-500';
  }

  async function approveRun(id: string) {
    if (!confirm('Approve this payroll run?')) return;
    const fd = new FormData();
    fd.set('id', id);
    await fetch('?/approve', { method: 'POST', body: fd });
  }
</script>

<DashboardContent title="Payroll" subtitle="Remedial session stipends auto-generated from teacher attendance">
  {#snippet headerActions()}
    <Button onclick={() => showGenerator = !showGenerator} variant="primary">
      {showGenerator ? 'Cancel' : 'Generate Payroll'}
    </Button>
  {/snippet}

  {#if form?.success && form?.count}
    <div class="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
      Generated {form.count} payroll record{form.count !== 1 ? 's' : ''} for {form.periodStart} to {form.periodEnd}.<br />
      Total amount: <strong>KES {Number(form.totalAmount).toLocaleString()}</strong>
    </div>
  {/if}
  {#if form?.error && showGenerator}
    <div class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  {#if showGenerator}
    <Card>
      <CardContent>
        <h3 class="mb-4 text-sm font-semibold text-ink-800">Generate Payroll</h3>
        <form method="POST" action="?/generate" use:enhance={() => { generating = true; }}>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="period_start" class="mb-1.5 block text-sm font-medium text-ink-700">Period Start</label>
              <input
                id="period_start" name="period_start" type="date" bind:value={periodStart} required
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label for="period_end" class="mb-1.5 block text-sm font-medium text-ink-700">Period End</label>
              <input
                id="period_end" name="period_end" type="date" bind:value={periodEnd} required
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <div class="mt-5">
            <Button type="submit" variant="primary" loading={generating}>
              Generate Payroll
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  {/if}

  <DataTable
    data={payroll}
    columns={[
      { key: 'teacher_name', label: 'Teacher', sortable: true },
      {
        key: 'period',
        label: 'Period',
        render: (p: any) => {
          const start = p.period_start ? new Date(p.period_start).toLocaleDateString() : '';
          const end = p.period_end ? new Date(p.period_end).toLocaleDateString() : '';
          return `${start} – ${end}`;
        },
      },
      { key: 'occurrences_count', label: 'Sessions' },
      {
        key: 'rate_per_session',
        label: 'Rate',
        render: (p: any) => `KES ${Number(p.rate_per_session).toLocaleString()}`,
      },
      {
        key: 'amount',
        label: 'Amount',
        render: (p: any) => `KES ${Number(p.amount).toLocaleString()}`,
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (p: any) =>
          `<span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadge(p.status)}">${p.status}</span>`,
      },
      {
        key: 'paid_at',
        label: 'Paid Date',
        render: (p: any) => p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—',
      },
    ]}
    onEdit={(item) => approveRun(item.id)}
    deleteLabel="Approve"
    emptyMessage="No payroll records. Generate payroll from teacher attendance."
  />
</DashboardContent>
