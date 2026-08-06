<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const s = $derived(data.stats);
  const runs = $derived(data.runs ?? []);
</script>

<DashboardContent title="School Payroll" subtitle="Direct monthly salaries for B.O.M.-employed teachers">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Salary Runs" value={s.totalRuns} sub="All time" />
    <KpiCard label="Paid" value={s.paidRuns} sub={`${s.pendingRuns} pending`} />
    <KpiCard label="Total Due" value={`KES ${s.totalDue.toLocaleString()}`} sub="Across all runs" />
    <KpiCard label="Total Paid" value={`KES ${s.totalPaid.toLocaleString()}`} sub="Settled" />
  </div>

  <div class="mt-8">
    <DataTable
      data={runs}
      columns={[
        { key: 'teacher_name', label: 'Teacher', sortable: true },
        { key: 'period', label: 'Period', render: (r: any) => `${r.period_start} – ${r.period_end}` },
        { key: 'salary_amount', label: 'Monthly Salary', render: (r: any) => `KES ${Number(r.salary_amount ?? r.amount ?? 0).toLocaleString()}` },
        { key: 'amount', label: 'Amount', render: (r: any) => `KES ${Number(r.amount ?? 0).toLocaleString()}`, sortable: true },
        { key: 'status', label: 'Status', sortable: true, render: (r: any) => r.status },
        { key: 'paid_at', label: 'Paid', render: (r: any) => r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—' },
      ]}
      emptyMessage="No school payroll runs yet. Set a monthly salary on teacher records, then generate."
    />
  </div>

  <div class="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
    <h3 class="text-sm font-semibold text-foreground">Generate monthly salary runs</h3>
    <p class="mt-1 text-xs text-muted-foreground">
      Creates one draft run per teacher with a monthly salary set (Finance &gt; Teachers &gt; edit teacher &gt; Monthly Salary).
    </p>
    <form method="POST" action="?/generate" class="mt-4 flex flex-wrap items-end gap-3">
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-muted-foreground">Period start</span>
        <input name="period_start" type="date" required
          class="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-muted-foreground">Period end</span>
        <input name="period_end" type="date" required
          class="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
      </label>
      <button type="submit"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90">
        Generate
      </button>
    </form>
  </div>
</DashboardContent>
