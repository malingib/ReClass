<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const tenants = $derived(data.tenants);
  const impersonating = $derived((data as any).impersonating ?? false);
  const impersonatedName = $derived((data as any).impersonatedName ?? '');

  async function viewTenant(id: string) {
    await fetch('?/impersonate', {
      method: 'POST',
      headers: { 'x-sveltekit-action': 'true' },
      body: new URLSearchParams({ tenant_id: id }),
    });
    location.href = '/admin/reclass';
  }

  async function stopImpersonating() {
    await fetch('?/stop', {
      method: 'POST',
      headers: { 'x-sveltekit-action': 'true' },
      body: new URLSearchParams({}),
    });
    location.href = '/super-admin/tenants';
  }
</script>

{#if impersonating}
  <div class="mb-4 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    <span>Viewing as tenant: <strong>{impersonatedName}</strong> (impersonation mode)</span>
    <button onclick={stopImpersonating} class="rounded-lg border border-amber-400 bg-white px-3 py-1 font-medium text-amber-800 hover:bg-amber-100">Stop impersonating</button>
  </div>
{/if}

<DashboardContent title="Tenants" subtitle="Schools on the platform">
  <DataTable data={tenants} columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'domain', label: 'Domain' },
    { key: 'status', label: 'Status', sortable: true },
  ]} emptyMessage="No tenants found">
    {#snippet rowExtra(t: any)}
      <button onclick={() => viewTenant(t.id)} class="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700">View as tenant</button>
    {/snippet}
  </DataTable>
</DashboardContent>
