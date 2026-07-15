<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let students = $derived(data.students);
</script>

<DashboardContent title="Students" subtitle="All enrolled students">
  {#snippet headerActions()}
    <a href="/admin/students/import" class="rounded-full bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600">Import</a>
  {/snippet}
  <DataTable
    data={students}
    columns={[
      { key: 'admission_no', label: 'Adm No', sortable: true },
      { key: 'first_name', label: 'Name', render: (s: any) => `${s.first_name} ${s.last_name}` },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No students found"
  />
</DashboardContent>
