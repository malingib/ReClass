<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';

  const { data } = $props();
  const announcements = $derived(data.announcements);
</script>

<DashboardContent title="Announcements" subtitle="Create and manage school communications">
  {#snippet headerActions()}
    <!-- Create/publish action is intentionally not wired yet (read-only audit pass) -->
    <Button variant="secondary" size="sm" disabled title="Creating announcements is coming soon">New Announcement (coming soon)</Button>
  {/snippet}

  <DataTable
    data={announcements}
    columns={[
      { key: 'title', label: 'Title' },
      { key: 'audience', label: 'Audience' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'published_at', label: 'Published', render: (a: any) => a.published_at ? new Date(a.published_at).toLocaleDateString('en-GB') : '—' },
    ]}
    emptyMessage="No announcements yet"
  />
</DashboardContent>
