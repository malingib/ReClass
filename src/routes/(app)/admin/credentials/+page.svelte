<script lang="ts">
  import { enhance } from '$app/forms';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data, form } = $props();
  let credentials = $derived(data.credentials);

  let showForm = $state(false);
  let editId = $state<string | null>(null);
  let formProvider = $state('mpesa');
  let formEnv = $state('sandbox');
  let formLabel = $state('');
  let formBlob = $state('');
  let saving = $state(false);
  let testing = $state<string | null>(null);
  let testResult = $state<{ id: string; ok: boolean; msg: string } | null>(null);

  function openAdd() {
    editId = null;
    formProvider = 'mpesa';
    formEnv = 'sandbox';
    formLabel = '';
    formBlob = '';
    showForm = true;
  }

  function openEdit(item: any) {
    editId = item.id;
    formProvider = item.provider;
    formEnv = item.environment;
    formLabel = item.label;
    formBlob = '';
    showForm = true;
  }

  function cancelForm() {
    showForm = false;
    editId = null;
  }

  async function runTest(id: string) {
    testing = id;
    testResult = null;

    const formData = new FormData();
    formData.set('id', id);
    const res = await fetch('?/test', { method: 'POST', body: formData });
    const result = await res.json();
    testing = null;

    if (result?.success) {
      testResult = { id, ok: result.testResult === 'ok', msg: result.message };
    } else {
      testResult = { id, ok: false, msg: result?.error ?? 'Test failed' };
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      ok: 'bg-brand-50 text-brand-700',
      failed: 'bg-danger/10 text-danger',
      untested: 'bg-ink-100 text-ink-500',
    };
    return map[status] ?? 'bg-ink-100 text-ink-500';
  }
</script>

<DashboardContent title="Credentials" subtitle="Mobiwave SMS &amp; Daraja M-Pesa credentials">
  {#snippet headerActions()}
    {#if !showForm}
      <Button onclick={openAdd} variant="primary">Add Credential</Button>
    {/if}
  {/snippet}

  {#if form?.success && !showForm}
    <div class="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
      Credential saved successfully.
    </div>
  {/if}
  {#if form?.error && !showForm}
    <div class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  {#if testResult}
    <div class="rounded-xl border {testResult.ok ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'} px-4 py-3 text-sm font-medium">
      {testResult.msg}
    </div>
  {/if}

  {#if showForm}
    <Card>
      <CardContent>
        <h3 class="mb-4 text-sm font-semibold text-ink-800">{editId ? 'Edit Credential' : 'Add Credential'}</h3>
        <form method="POST" action="?/save" use:enhance={() => { saving = true; }}>
          {#if editId}
            <input type="hidden" name="id" value={editId} />
          {/if}
          <div class="space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-700">Provider</label>
              <select
                name="provider"
                bind:value={formProvider}
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="mpesa">M-Pesa (Daraja)</option>
                <option value="mobiwave_sms">Mobiwave SMS</option>
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-700">Environment</label>
              <select
                name="environment"
                bind:value={formEnv}
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-700">Label</label>
              <input
                name="label" type="text" bind:value={formLabel}
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="e.g. Production Daraja"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-700">
                {formProvider === 'mpesa' ? 'JSON Blob (consumer_key, consumer_secret, passkey, shortcode)' : 'API Token'}
              </label>
              <textarea
                name="encrypted_blob"
                bind:value={formBlob}
                rows={4}
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 font-mono placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder={formProvider === 'mpesa' ? '{"consumer_key":"...","consumer_secret":"...","passkey":"...","shortcode":"..."}' : '{"api_token":"..."}'}
                required
              ></textarea>
              <p class="mt-1 text-xs text-ink-400">This data will be encrypted at rest.</p>
            </div>
            <div class="flex items-center gap-3">
              <Button type="submit" variant="primary" loading={saving}>
                {editId ? 'Update' : 'Save'} Credential
              </Button>
              <Button type="button" variant="ghost" onclick={cancelForm}>Cancel</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  {:else}
    {#if credentials.length === 0}
      <div class="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-border/80 bg-white/70 px-6 py-12 text-center shadow-card">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <p class="text-sm text-ink-500">No credentials configured yet</p>
        <Button onclick={openAdd} variant="secondary">Add Credential</Button>
      </div>
    {:else}
      <DataTable
        data={credentials}
        columns={[
          { key: 'label', label: 'Name', sortable: true },
          {
            key: 'provider',
            label: 'Provider',
            render: (c: any) => c.provider === 'mpesa' ? 'M-Pesa (Daraja)' : 'Mobiwave SMS',
            sortable: true,
          },
          { key: 'environment', label: 'Environment', sortable: true },
          {
            key: 'test_status',
            label: 'Test Status',
            render: (c: any) => `<span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadge(c.test_status)}">${c.test_status}</span>`,
          },
        ]}
        onEdit={openEdit}
        onDelete={async (item) => {
          if (!confirm(`Delete credential "${item.label}"?`)) return;
          const fd = new FormData();
          fd.set('id', item.id);
          await fetch('?/delete', { method: 'POST', body: fd });
        }}
        deleteLabel="Delete"
        emptyMessage="No credentials"
      />
    {/if}

    {#if credentials.length > 0}
      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each credentials as cred}
          <div class="rounded-xl border border-border bg-white p-4 shadow-card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-ink-800">{cred.label}</p>
                <p class="text-xs text-ink-400">{cred.provider === 'mpesa' ? 'M-Pesa' : 'SMS'} · {cred.environment}</p>
              </div>
              <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide {statusBadge(cred.test_status)}">
                {cred.test_status}
              </span>
            </div>
            <div class="mt-3 flex gap-2">
              <Button
                size="sm" variant="secondary"
                onclick={() => runTest(cred.id)}
                loading={testing === cred.id}
              >
                Test
              </Button>
              <Button size="sm" variant="ghost" onclick={() => openEdit(cred)}>Edit</Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</DashboardContent>
