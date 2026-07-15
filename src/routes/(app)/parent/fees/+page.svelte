<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let fees = $derived(data.fees);
</script>

<DashboardContent title="Remedial fee structure" subtitle="What your child's remediation costs and when">
  <DataTable data={fees} columns={[
    { key: 'name', label: 'Fee', sortable: true },
    { key: 'amount', label: 'Amount', render: (f: any) => `KES ${Number(f.amount).toLocaleString()}` },
    { key: 'frequency', label: 'Cadence' },
    { key: 'status', label: 'Status' },
  ]} emptyMessage="No fee records" />
</DashboardContent>
