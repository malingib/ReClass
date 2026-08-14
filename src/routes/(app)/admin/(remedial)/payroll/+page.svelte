<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { enhance } from '$app/forms';
  import { dispatchToast } from '$lib/notifications';

  const { data } = $props();
  const s = $derived(data.stats);
  const runs = $derived(data.runs ?? []);

  const approved = $derived(runs.filter((r: any) => r.status === 'approved'));
  const drafts = $derived(runs.filter((r: any) => r.status === 'draft'));

  let period_start = $state('');
  let period_end = $state('');
  let approveId = $state('');
  let payId = $state('');

  function handleResult({ result, update }: { result: any; update: () => void }) {
    const ok = result?.type === 'success' && result?.data?.success;
    dispatchToast(ok ? 'Payroll' : 'Error', result?.data?.message ?? result?.data?.error ?? (ok ? 'Done.' : 'Something went wrong.'));
    update();
  }
</script>

<DashboardContent title="Payroll" subtitle="Teacher remedial payroll — runs generated from approved attendance, paid out via M-Pesa B2C">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
    <KpiCard label="Runs" value={s.totalRuns} sub="All time" />
    <KpiCard label="Pending" value={s.pendingRuns} sub="Awaiting payment" />
    <KpiCard label="Processing" value={s.processingRuns} sub="M-Pesa in flight" />
    <KpiCard label="Paid" value={s.paidRuns} sub="Settled" />
    <KpiCard label="Failed" value={s.failedRuns} sub="Needs attention" />
    <KpiCard label="Total Due" value={`KES ${s.totalDue.toLocaleString()}`} sub={`Paid: KES ${s.totalPaid.toLocaleString()}`} />
  </div>

  <div class="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
    <form method="POST" action="?/generate" use:enhance={() => handleResult} class="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 class="text-sm font-semibold text-foreground">Generate Payroll</h3>
      <p class="mt-1 text-xs text-muted-foreground">Creates draft runs from approved attendance in the period.</p>
      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label class="text-xs font-medium text-foreground">Period Start
          <input type="date" name="period_start" bind:value={period_start} class="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" required />
        </label>
        <label class="text-xs font-medium text-foreground">Period End
          <input type="date" name="period_end" bind:value={period_end} class="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" required />
        </label>
      </div>
      <Button type="submit" class="mt-4" size="sm">Generate Drafts</Button>
    </form>

    <form method="POST" action="?/approve" use:enhance={() => handleResult} class="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 class="text-sm font-semibold text-foreground">Approve Draft</h3>
      <p class="mt-1 text-xs text-muted-foreground">Approve a draft run so the treasurer can pay it out.</p>
      <select name="id" bind:value={approveId} class="mt-4 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" required>
        <option value="" disabled>Select draft…</option>
        {#each drafts as r (r.id)}
          <option value={r.id}>{r.teacher_name} — KES {Number(r.amount ?? 0).toLocaleString()}</option>
        {/each}
      </select>
      <Button type="submit" class="mt-4" size="sm" disabled={drafts.length === 0}>Approve</Button>
    </form>

    <form method="POST" action="?/pay" use:enhance={() => handleResult} class="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 class="text-sm font-semibold text-foreground">Pay via M-Pesa B2C</h3>
      <p class="mt-1 text-xs text-muted-foreground">Sends the payout to the teacher's registered M-Pesa number.</p>
      <select name="id" bind:value={payId} class="mt-4 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" required>
        <option value="" disabled>Select approved run…</option>
        {#each approved as r (r.id)}
          <option value={r.id}>{r.teacher_name} — KES {Number(r.amount ?? 0).toLocaleString()}</option>
        {/each}
      </select>
      <Button type="submit" class="mt-4" size="sm" disabled={approved.length === 0}>Pay {approved.length > 0 ? 'Selected' : ''}</Button>
    </form>
  </div>

  <div class="mt-8">
    <DataTable
      data={runs}
      columns={[
        { key: 'teacher_name', label: 'Teacher', sortable: true },
        { key: 'period', label: 'Period', render: (r: any) => `${r.period_start} – ${r.period_end}` },
        { key: 'occurrences_count', label: 'Sessions', sortable: true },
        { key: 'rate_per_session', label: 'Rate', render: (r: any) => `KES ${Number(r.rate_per_session ?? 0).toLocaleString()}` },
        { key: 'amount', label: 'Amount', render: (r: any) => `KES ${Number(r.amount ?? 0).toLocaleString()}`, sortable: true },
        {
          key: 'status', label: 'Status', sortable: true, render: (r: any) => {
            if (r.status === 'failed') return `failed${r.b2c_status ? ` · ${r.b2c_status}` : ''}`;
            if (r.status === 'processing') return 'processing (M-Pesa)';
            return r.status;
          },
        },
        { key: 'last_error', label: 'Reason', render: (r: any) => r.status === 'failed' ? (r.last_error ?? '—') : '—' },
        { key: 'paid_at', label: 'Paid', render: (r: any) => r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—' },
      ]}
      emptyMessage="No payroll runs yet"
    />
  </div>

  <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/admin/reports/revenue-csv" download
      class="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-foreground">Payroll Export</h3>
        <p class="mt-1 text-xs text-muted-foreground">Download payroll summary as CSV.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-amber-700 group-hover:text-amber-800">
        Download CSV
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/parent-payments"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m13.5-1.5v.75a.75.75 0 0 1-.75.75h-.75" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-foreground">Parent Payments</h3>
        <p class="mt-1 text-xs text-muted-foreground">View parent payments and M-Pesa transaction history.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary group-hover:text-primary/80">
        View Payments
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
  </div>
</DashboardContent>
