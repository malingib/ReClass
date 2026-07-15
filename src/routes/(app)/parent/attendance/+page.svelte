<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let attendance = $derived(data.attendance);
</script>

<DashboardContent title="Attendance" subtitle="Your child's attendance">
  <DataTable data={attendance} columns={[
    { key: 'students', label: 'Student', render: (a: any) => a.students ? `${a.students.first_name} ${a.students.last_name}` : '—' },
    { key: 'date', label: 'Date', render: (a: any) => a.date ? new Date(a.date).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', sortable: true },
  ]} emptyMessage="No attendance records" />
</DashboardContent>
