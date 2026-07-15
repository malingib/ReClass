<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let attendance = $derived(data.attendance);
</script>

<DashboardContent title="My teacher attendance" subtitle="Confirming which remedial sessions you held">
  <DataTable
    data={attendance}
    columns={[
      { key: 'session', label: 'Session', render: (a: any) => a.session_label ?? a.title ?? 'Remedial session' },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'marked_at', label: 'Marked', render: (a: any) => a.marked_at ? new Date(a.marked_at).toLocaleString() : '—' },
    ]}
    emptyMessage="No attendance records yet"
  />
</DashboardContent>
