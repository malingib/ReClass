<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const invoices = $derived(data.invoices);
</script>

<DashboardContent title="Payments" subtitle="Payment history">
  <DataTable data={invoices} columns={[
    { key: 'amount_due', label: 'Amount', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}` },
    { key: 'amount_paid', label: 'Paid', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}` },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'due_date', label: 'Date', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—' },
  ]} emptyMessage="No payments yet" />
</DashboardContent>
