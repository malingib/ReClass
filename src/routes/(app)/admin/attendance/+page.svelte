<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let attendance = $derived(data.attendance);
</script>

<DashboardContent title="Teacher attendance" subtitle="Remedial session attendance captured from teachers">
  <DataTable
    data={attendance}
    columns={[
      { key: 'teacher', label: 'Teacher', render: (a: any) => a.teacher_name ?? a.teachers?.full_name ?? '—' },
      { key: 'group', label: 'Remedial group', render: (a: any) => a.group_name ?? a.subject ?? '—' },
      { key: 'date', label: 'Date', render: (a: any) => a.date ? new Date(a.date).toLocaleDateString() : '—' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No teacher attendance captured yet"
  />
</DashboardContent>
