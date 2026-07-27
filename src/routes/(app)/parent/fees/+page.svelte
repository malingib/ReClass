<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const fees = $derived(data.fees);
</script>

<DashboardContent title="Remedial fee structure" subtitle="What your child's remediation costs and when">
  <DataTable data={fees} columns={[
    { key: 'name', label: 'Fee', sortable: true },
    { key: 'amount', label: 'Amount', render: (f: any) => `KES ${Number(f.amount).toLocaleString()}` },
    { key: 'due_date', label: 'Due', render: (f: any) => f.due_date ? new Date(f.due_date).toLocaleDateString() : '—' },
    { key: 'term', label: 'Term' },
  ]} emptyMessage="No fee records" />
</DashboardContent>
