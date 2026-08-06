<script lang="ts">
  import { enhance } from '$app/forms';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data, form } = $props();
  const credentials = $derived(data.credentials);

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

  function statusVariant(status: string) {
    const map: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ok: 'default',
      failed: 'destructive',
      untested: 'secondary',
    };
    return map[status] ?? 'secondary';
  }
</script>

<DashboardContent title="Credentials" subtitle="Mobiwave SMS &amp; Daraja M-Pesa credentials">
  {#snippet headerActions()}
    {#if !showForm}
      <Button onclick={openAdd}>Add Credential</Button>
    {/if}
  {/snippet}

  {#if form?.success && !showForm}
    <Alert>
      <AlertTitle>Credential saved successfully.</AlertTitle>
    </Alert>
  {/if}
  {#if form?.error && !showForm}
    <Alert variant="destructive">
      <AlertTitle>{form.error}</AlertTitle>
    </Alert>
  {/if}

  {#if testResult}
    <Alert variant={testResult.ok ? 'default' : 'destructive'}>
      <AlertTitle>{testResult.msg}</AlertTitle>
    </Alert>
  {/if}

  {#if showForm}
    <Card>
      <CardContent class="pt-6">
        <h3 class="mb-4 text-sm font-semibold text-foreground">{editId ? 'Edit Credential' : 'Add Credential'}</h3>
        <form method="POST" action="?/save" use:enhance={() => {
          saving = true;
          return async () => { saving = false; };
        }}>
          {#if editId}
            <input type="hidden" name="id" value={editId} />
          {/if}
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="cred-provider">Provider</Label>
              <select
                id="cred-provider" name="provider"
                bind:value={formProvider}
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="mpesa">M-Pesa (Daraja)</option>
                <option value="mobiwave_sms">Mobiwave SMS</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="cred-env">Environment</Label>
              <select
                id="cred-env" name="environment"
                bind:value={formEnv}
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="cred-label">Label</Label>
              <Input
                id="cred-label" name="label" type="text" bind:value={formLabel}
                placeholder="e.g. Production Daraja"
              />
            </div>
            <div class="space-y-2">
              <Label for="cred-blob">
                {formProvider === 'mpesa' ? 'JSON Blob (consumer_key, consumer_secret, passkey, shortcode)' : 'API Token'}
              </Label>
              <textarea
                id="cred-blob" name="encrypted_blob"
                bind:value={formBlob}
                rows={4}
                class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                placeholder={formProvider === 'mpesa' ? '{"consumer_key":"...","consumer_secret":"...","passkey":"...","shortcode":"..."}' : '{"api_token":"..."}'}
                required
              ></textarea>
              <p class="text-xs text-muted-foreground">This data will be encrypted at rest.</p>
            </div>
            <div class="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {#if saving}
                  <svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                {:else}
                  {editId ? 'Update' : 'Save'} Credential
                {/if}
              </Button>
              <Button type="button" variant="outline" onclick={cancelForm}>Cancel</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  {:else}
    {#if credentials.length === 0}
      <div class="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">No credentials configured yet</p>
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
            render: (c: any) => `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">${c.test_status}</span>`,
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
          <Card>
            <CardContent class="pt-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-foreground">{cred.label}</p>
                  <p class="text-xs text-muted-foreground">{cred.provider === 'mpesa' ? 'M-Pesa' : 'SMS'} · {cred.environment}</p>
                </div>
                <Badge variant={statusVariant(cred.test_status ?? 'untested')}>
                  {cred.test_status}
                </Badge>
              </div>
              <div class="mt-3 flex gap-2">
                <Button
                  size="sm" variant="secondary"
                  onclick={() => runTest(cred.id)}
                  disabled={testing === cred.id}
                >
                  {#if testing === cred.id}
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  {:else}
                    Test
                  {/if}
                </Button>
                <Button size="sm" variant="ghost" onclick={() => openEdit(cred)}>Edit</Button>
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    {/if}
  {/if}
</DashboardContent>
