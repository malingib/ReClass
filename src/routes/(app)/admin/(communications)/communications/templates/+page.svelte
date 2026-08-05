<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';

  const { data } = $props();
  const templates = $derived(data.templates);
</script>

<DashboardContent title="Message Templates" subtitle="Reusable SMS and email message templates">
  {#snippet headerActions()}
    <!-- Create action is intentionally not wired yet (read-only audit pass) -->
    <Button variant="secondary" size="sm" disabled title="Creating templates is coming soon">New Template (coming soon)</Button>
  {/snippet}

  <DataTable
    data={templates}
    columns={[
      { key: 'name', label: 'Name' },
      { key: 'channel', label: 'Channel', render: (t: any) => t.channel ?? '—' },
      { key: 'subject', label: 'Subject', render: (t: any) => t.subject ?? '—' },
      { key: 'variables', label: 'Variables', render: (t: any) => t.variables?.join(', ') ?? '—' },
    ]}
    emptyMessage="No templates yet"
  />
</DashboardContent>
