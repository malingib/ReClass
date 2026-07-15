<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let logs = $derived(data.logs);
</script>

<DashboardContent title="Audit Log" subtitle="Full platform audit trail">
  <DataTable data={logs} columns={[
    { key: 'action', label: 'Action', sortable: true },
    { key: 'user_id', label: 'User' },
    { key: 'created_at', label: 'Time', render: (l: any) => l.created_at ? new Date(l.created_at).toLocaleString() : '—', sortable: true },
    { key: 'details', label: 'Details' },
  ]} emptyMessage="No audit logs found" />
</DashboardContent>
