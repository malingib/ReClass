<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let aging = $derived(data.aging);
</script>

<DashboardContent title="Aging" subtitle="Parental M-Pesa payments overdue">
  <DataTable data={aging} columns={[
    { key: 'amount_due', label: 'Amount', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}` },
    { key: 'due_date', label: 'Due', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—', sortable: true },
    { key: 'status', label: 'Status' },
  ]} emptyMessage="No overdue invoices" />
</DashboardContent>
