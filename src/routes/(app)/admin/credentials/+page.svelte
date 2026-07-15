<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let credentials = $derived(data.credentials);
</script>

<DashboardContent title="Mobiwave & Daraja credentials" subtitle="Per-tenant SMS and M-Pesa paybill credentials">
  <DataTable
    data={credentials}
    columns={[
      { key: 'name', label: 'Name', sortable: true },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No credentials yet"
  />
</DashboardContent>
