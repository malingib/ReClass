<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const logs = $derived(data.logs);
  const pagination = $derived(data.pagination);
</script>

<DashboardContent title="Audit Log" subtitle="Full platform audit trail">
  <DataTable data={logs} columns={[
    { key: 'action', label: 'Action', sortable: true },
    { key: 'actor_id', label: 'Actor', render: (l: any) => l.actor_id ? `<span class="font-mono text-xs">${String(l.actor_id).slice(0,8)}</span>` : '—', html: true, sortable: true },
    { key: 'entity', label: 'Entity', sortable: true },
    { key: 'created_at', label: 'Time', render: (l: any) => l.created_at ? new Date(l.created_at).toLocaleString() : '—', sortable: true },
    { key: 'details', label: 'Details', render: (l: any) => l.entity_id ? `${l.entity}:${String(l.entity_id).slice(0,8)}` : l.entity ?? '—' },
  ]} emptyMessage="No audit logs found" server={{ total: pagination.total, page: pagination.page, pageSize: pagination.pageSize, search: pagination.search, sortKey: pagination.sortKey, sortDir: pagination.sortDir }} />
</DashboardContent>
