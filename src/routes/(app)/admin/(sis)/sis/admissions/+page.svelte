<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  const { data } = $props();
  const admissions = $derived(data.admissions);
</script>

<DashboardContent title="Admissions" subtitle="Student applications and admission tracking">
  {#snippet headerActions()}
    <Button href="/admin/students" variant="outline">Go to Students</Button>
  {/snippet}

  <DataTable
    data={admissions}
    columns={[
      { key: 'admission_number', label: 'Admission No' },
      { key: 'student', label: 'Student', render: (a: any) => a.students ? `${a.students.first_name} ${a.students.last_name}` : '—' },
      { key: 'grade_applied', label: 'Grade Applied', render: (a: any) => a.grade_applied ?? '—' },
      { key: 'status', label: 'Status' },
      { key: 'admission_date', label: 'Date', render: (a: any) => new Date(a.admission_date).toLocaleDateString('en-GB') },
    ]}
    emptyMessage="No admissions found"
  />
</DashboardContent>
