<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  const { data } = $props();
  const classes = $derived(data.classes);
</script>

<DashboardContent title="Classes & Streams" subtitle="Manage forms, streams and homeroom assignments">
  {#snippet headerActions()}
    <Button href="/admin/subjects" variant="outline">Manage Subjects</Button>
  {/snippet}

  <DataTable
    data={classes}
    columns={[
      { key: 'name', label: 'Name' },
      { key: 'stream', label: 'Stream', render: (c: any) => c.stream ?? '—' },
      { key: 'code', label: 'Code' },
      { key: 'academic_year', label: 'Academic Year', render: (c: any) => c.academic_year ?? '—' },
      { key: 'homeroom_teacher', label: 'Homeroom Teacher', render: (c: any) => c.teachers ? `${c.teachers.first_name} ${c.teachers.last_name}` : '—' },
      { key: 'status', label: 'Status' },
    ]}
    emptyMessage="No classes found"
  />
</DashboardContent>
