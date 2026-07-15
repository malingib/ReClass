<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let stats = $derived(data.stats);
  let audit = $derived(data.audit);
</script>

<DashboardContent title="Super Admin" subtitle="Platform-wide oversight">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <KpiCard label="Tenants" value={stats.tenants} sub="Active schools" />
  </div>
  <div class="rounded-xl border border-border bg-white p-5 shadow-card">
    <h3 class="text-sm font-semibold text-ink-900 mb-3">Recent Audit Log</h3>
    <DataTable data={audit} columns={[
      { key: 'action', label: 'Action' },
      { key: 'user_id', label: 'User' },
      { key: 'created_at', label: 'Time', render: (a: any) => a.created_at ? new Date(a.created_at).toLocaleString() : '—' },
    ]} emptyMessage="No audit logs" />
  </div>
</DashboardContent>
