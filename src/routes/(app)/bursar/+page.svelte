<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import Button from '$lib/components/ui/button.svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
  const totalRevenue = $derived(data.totalRevenue);
  const invoices = $derived(data.invoices ?? []);
  const statusCounts = $derived(data.statusCounts ?? {});
  const totalDue = $derived(data.totalDue ?? 0);
  const totalPaid = $derived(data.totalPaid ?? 0);
  const outstanding = $derived(data.outstanding ?? 0);
  const checkouts = $derived(data.checkouts ?? []);

  let searchQuery = $state('');
  let statusFilter = $state('all');
  let dateFrom = $state('');
  let dateTo = $state('');

  const filtered = $derived.by(() => {
    let result = invoices;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i: any) =>
        (i.student_name?.toLowerCase() ?? '').includes(q) ||
        (i.admission_no?.toLowerCase() ?? '').includes(q) ||
        (i.grade?.toLowerCase() ?? '').includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((i: any) => i.status === statusFilter);
    }
    if (dateFrom) {
      result = result.filter((i: any) => (i.created_at ?? '') >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((i: any) => (i.created_at ?? '') <= dateTo + 'T23:59:59');
    }
    return result;
  });

  function downloadCsv() {
    const headers = ['Student', 'Admission No', 'Grade', 'Amount Due', 'Amount Paid', 'Status', 'Due Date', 'Created'];
    const rows = filtered.map((i: any) => [
      i.student_name, i.admission_no, i.grade,
      i.amount_due, i.amount_paid, i.status,
      i.due_date ?? '—', i.created_at?.split('T')[0] ?? '—',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<DashboardContent title="Bursar workspace" subtitle="M-Pesa payments, revenue, and invoice management">
  {#snippet headerActions()}
    <Button variant="primary" size="sm" onclick={downloadCsv}>Download CSV</Button>
    <a href="/bursar/csv" class="rounded-lg border border-border px-4 py-2 text-xs font-medium text-ink-600 hover:bg-ink-50">Export All</a>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
    <KpiCard label="Total Invoices" value={stats.invoices} sub="All time" />
    <KpiCard label="Revenue (12mo)" value={`KES ${totalRevenue.toLocaleString()}`} sub="M-Pesa collections" />
    <KpiCard label="Paid" value={stats.paid} sub="Settled" />
    <KpiCard label="Outstanding" value={stats.unpaid} sub="Awaiting payment" />
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap items-center gap-3">
    <input type="text" placeholder="Search by student, admission no, grade…" bind:value={searchQuery}
      class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600 min-w-[200px] focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
    <select bind:value={statusFilter}
      class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
      <option value="all">All statuses</option>
      <option value="unpaid">Unpaid</option>
      <option value="partial">Partial</option>
      <option value="paid">Paid</option>
      <option value="waived">Waived</option>
      <option value="overpaid">Overpaid</option>
    </select>
    <input type="date" bind:value={dateFrom}
      class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
    <input type="date" bind:value={dateTo}
      class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
    {#if filtered.length !== invoices.length}
      <span class="text-xs text-ink-400">{filtered.length} of {invoices.length} shown</span>
    {/if}
  </div>

  <!-- Status breakdown -->
  {#if Object.keys(statusCounts).length > 0}
    <div class="flex flex-wrap gap-2">
      {#each Object.entries(statusCounts) as [status, count]}
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-ink-600">
          <span class="h-2 w-2 rounded-full {status === 'paid' ? 'bg-success' : status === 'unpaid' ? 'bg-amber-500' : status === 'waived' ? 'bg-ink-300' : status === 'partial' ? 'bg-warning' : 'bg-ink-300'}"></span>
          {status}: {count}
        </span>
      {/each}
    </div>
  {/if}

  <!-- KPI summary row -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-xs text-ink-500">Total Due</p>
      <p class="text-lg font-semibold text-ink-900">KES {totalDue.toLocaleString()}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-xs text-ink-500">Total Paid</p>
      <p class="text-lg font-semibold text-success">KES {totalPaid.toLocaleString()}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-xs text-ink-500">Outstanding</p>
      <p class="text-lg font-semibold text-danger">KES {outstanding.toLocaleString()}</p>
    </div>
  </div>

  <DataTable data={filtered} columns={[
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'admission_no', label: 'Adm No', sortable: true },
    { key: 'grade', label: 'Grade', sortable: true },
    { key: 'amount_due', label: 'Due (KES)', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}`, sortable: true },
    { key: 'amount_paid', label: 'Paid (KES)', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}`, sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (i: any) => {
      const cls = i.status === 'paid' ? 'text-success bg-success/10' : i.status === 'unpaid' ? 'text-danger bg-danger/10' : i.status === 'partial' ? 'text-warning bg-warning/10' : i.status === 'waived' ? 'text-ink-500 bg-ink-100' : 'text-ink-500 bg-ink-100';
      return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}">${i.status}</span>`;
    }},
    { key: 'created_at', label: 'Date', render: (i: any) => i.created_at?.split('T')[0] ?? '—', sortable: true },
  ]} emptyMessage="No invoices found" />

  <!-- Failed/pending checkouts -->
  {#if checkouts.length > 0}
    <div>
      <h3 class="text-sm font-semibold text-ink-900">Failed / Pending STK Pushes</h3>
      <p class="text-xs text-ink-500">Checkout requests that did not complete. These may need manual follow-up.</p>
      <div class="overflow-x-auto rounded-xl border border-border bg-white">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-ink-50 text-left text-xs font-medium text-ink-500">
              <th class="px-4 py-3">Phone</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Reason</th>
              <th class="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {#each checkouts as c}
              <tr class="border-b border-border last:border-0">
                <td class="px-4 py-2.5 text-ink-900">{c.phone ?? '—'}</td>
                <td class="px-4 py-2.5 text-ink-900">KES {Number(c.amount).toLocaleString()}</td>
                <td class="px-4 py-2.5">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {c.status === 'failed' ? 'text-danger bg-danger/10' : 'text-warning bg-warning/10'}">{c.status}</span>
                </td>
                <td class="px-4 py-2.5 text-ink-500">{c.reason ?? '—'}</td>
                <td class="px-4 py-2.5 text-ink-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</DashboardContent>
