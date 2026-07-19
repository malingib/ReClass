<script lang="ts">
  // @ts-nocheck
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';

  const { data } = $props();
  const invoices = $derived(data.invoices ?? []);
  const statusCounts = $derived(data.statusCounts ?? {});
  const totalDue = $derived(data.totalDue ?? 0);
  const totalPaid = $derived(data.totalPaid ?? 0);
  const outstanding = $derived(data.outstanding ?? 0);

  let searchQuery = $state('');
  let statusFilter = $state('all');
  let dateFrom = $state('');
  let dateTo = $state('');

  const filtered = $derived.by(() => {
    let result = invoices;
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i: any) =>
        (i.student_name?.toLowerCase() ?? '').includes(q) ||
        (i.admission_no?.toLowerCase() ?? '').includes(q) ||
        (i.grade?.toLowerCase() ?? '').includes(q)
      );
    }
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((i: any) => i.status === statusFilter);
    }
    // Date range filter
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
      i.student_name,
      i.admission_no,
      i.grade,
      i.amount_due,
      i.amount_paid,
      i.status,
      i.due_date ?? '—',
      i.created_at?.split('T')[0] ?? '—',
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

<DashboardContent title="Export" subtitle="Export financial data — invoices, payments, and status">
  {#snippet headerActions()}
    <Button variant="primary" size="sm" onclick={downloadCsv}>Download CSV</Button>
  {/snippet}

  <!-- Summary cards -->
  <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Total Invoices" value={invoices.length} sub="All time" />
    <KpiCard label="Total Due" value={`KES ${totalDue.toLocaleString()}`} sub="Gross billings" />
    <KpiCard label="Total Paid" value={`KES ${totalPaid.toLocaleString()}`} sub="Net collections" />
    <KpiCard label="Outstanding" value={`KES ${outstanding.toLocaleString()}`} sub="Still unpaid" />
  </div>

  <!-- Filters -->
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <input
      type="text"
      placeholder="Search by student, admission no, grade…"
      bind:value={searchQuery}
      class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600 min-w-[220px] focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
    />
    <select
      bind:value={statusFilter}
      class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
    >
      <option value="all">All statuses</option>
      <option value="pending">Pending</option>
      <option value="paid">Paid</option>
      <option value="overdue">Overdue</option>
      <option value="waived">Waived</option>
    </select>
    <input
      type="date"
      bind:value={dateFrom}
      class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
      placeholder="From date"
    />
    <input
      type="date"
      bind:value={dateTo}
      class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
      placeholder="To date"
    />
    {#if filtered.length !== invoices.length}
      <span class="text-xs text-ink-400">{filtered.length} of {invoices.length} shown</span>
    {/if}
  </div>

  <!-- Status breakdown -->
  {#if Object.keys(statusCounts).length > 0}
    <div class="mb-4 flex flex-wrap gap-2">
      {#each Object.entries(statusCounts) as [status, count]}
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-ink-600">
          <span class="h-2 w-2 rounded-full {status === 'paid' ? 'bg-success' : status === 'overdue' ? 'bg-danger' : status === 'waived' ? 'bg-warning' : 'bg-ink-300'}"></span>
          {status}: {count}
        </span>
      {/each}
    </div>
  {/if}

  <DataTable
    data={filtered}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Adm No', sortable: true },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'amount_due', label: 'Due (KES)', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}`, sortable: true },
      { key: 'amount_paid', label: 'Paid (KES)', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}`, sortable: true },
      { key: 'status', label: 'Status', sortable: true, render: (i: any) => {
        const colors: Record<string, string> = { paid: 'text-success bg-success/10', overdue: 'text-danger bg-danger/10', pending: 'text-warning bg-warning/10', waived: 'text-ink-500 bg-ink-100' };
        const cls = colors[i.status] ?? 'text-ink-500 bg-ink-100';
        return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}">${i.status}</span>`;
      }},
      { key: 'created_at', label: 'Date', render: (i: any) => i.created_at?.split('T')[0] ?? '—', sortable: true },
    ]}
    emptyMessage="No invoices found matching your filters"
  />
</DashboardContent>
