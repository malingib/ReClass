<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  // Placeholder data — wire to server endpoint aggregating invoices/payments
  let data = [
    { date: '2026-07-15', type: 'Invoice', count: 5, total: 12500 },
    { date: '2026-07-14', type: 'Payment', count: 8, total: 9200 },
    { date: '2026-07-13', type: 'Waiver', count: 2, total: 4000 },
    { date: '2026-07-12', type: 'Invoice', count: 3, total: 7500 },
  ];
</script>

<DashboardContent title="Export" subtitle="Export financial data">
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <select class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600">
      <option>All types</option>
      <option>Invoices</option>
      <option>Payments</option>
      <option>Waivers</option>
    </select>
    <input type="date" class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600" />
    <input type="date" class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-600" />
    <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-btn transition-colors hover:bg-brand-700">
      Export CSV
    </button>
  </div>
  <DataTable
    data={data}
    columns={[
      { key: 'date', label: 'Date', sortable: true },
      { key: 'type', label: 'Type', sortable: true },
      { key: 'count', label: 'Records', sortable: true },
      { key: 'total', label: 'Total (KES)', render: (d: any) => `KES ${Number(d.total).toLocaleString()}`, sortable: true },
    ]}
    emptyMessage="No data to export"
  />
</DashboardContent>
