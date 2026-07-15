<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let stats = $derived(data.stats);
  let recent = $derived(data.recent);
</script>

<DashboardContent title="Bursar workspace" subtitle="Parent M-Pesa reconciliation and waivers">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <KpiCard label="Invoices" value={stats.invoices} sub="Total issued" />
    <KpiCard label="M-Pesa paid" value={stats.paid} sub="Settled" />
    <KpiCard label="Outstanding" value={stats.unpaid} sub="Awaiting paybill" />
  </div>
  <DataTable data={recent} columns={[
    { key: 'amount_paid', label: 'Paid', render: (i: any) => `KES ${Number(i.amount_paid ?? 0).toLocaleString()}` },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'due_date', label: 'Due', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—' },
  ]} emptyMessage="No recent invoices" />
</DashboardContent>
