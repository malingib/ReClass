<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let enrollments = $derived(data.enrollments);
</script>

<DashboardContent title="Enrollment" subtitle="Recent student enrolments">
  <DataTable
    data={enrollments}
    columns={[
      { key: 'admission_no', label: 'Adm No', sortable: true },
      { key: 'first_name', label: 'Name', render: (e: any) => `${e.first_name} ${e.last_name}` },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'created_at', label: 'Enrolled', render: (e: any) => e.created_at ? new Date(e.created_at).toLocaleDateString() : '—' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No enrolments yet"
  />
</DashboardContent>
