<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let fees = $derived(data.fees);
</script>

<DashboardContent title="Fee structures" subtitle="Remedial fee definitions assigned to cohorts">
  <DataTable
    data={fees}
    columns={[
      { key: 'name', label: 'Fee', sortable: true },
      { key: 'amount', label: 'Amount', render: (f: any) => `KES ${Number(f.amount).toLocaleString()}` },
      { key: 'grade', label: 'Cohort', sortable: true },
      { key: 'frequency', label: 'Cadence' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No remedial fee definitions yet"
  />
</DashboardContent>
