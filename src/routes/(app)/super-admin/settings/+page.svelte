<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Alert, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { enhance } from '$app/forms';

  const { data } = $props();
  const config = $derived((data.config ?? {}) as Record<string, string>);
  const configuredKeys = $derived((data.configuredKeys ?? []) as string[]);
  const credentials = $derived((data.credentials ?? []) as any[]);

  let mpesaSecretValue = $state('');
  let publicUrlValue = $state('');
  let savingKey = $state<string | null>(null);
  let removingKey = $state<string | null>(null);

  let credSaving = $state(false);
  let credEditId = $state('');
  let credProvider = $state('mpesa');
  let credEnv = $state('production');
  let credLabel = $state('');
  let credBlob = $state('');
  let credTesting = $state<string | null>(null);
  let credTestResult = $state<{ ok: boolean; msg: string } | null>(null);

  async function submitConfig(key: string, value: string) {
    savingKey = key;
    const fd = new FormData();
    fd.set('key', key);
    fd.set('value', value);
    const res = await fetch('?/config-set', { method: 'POST', body: fd });
    await res.json();
    savingKey = null;
    if (key === 'mpesa_callback_secret') mpesaSecretValue = '';
    if (key === 'public_url') publicUrlValue = '';
  }

  async function removeConfig(key: string) {
    removingKey = key;
    const fd = new FormData();
    fd.set('key', key);
    const res = await fetch('?/config-remove', { method: 'POST', body: fd });
    await res.json();
    removingKey = null;
  }

  function openCredEdit(cred: any) {
    credEditId = cred.id;
    credProvider = cred.provider ?? 'mpesa';
    credEnv = cred.environment ?? 'production';
    credLabel = cred.label ?? '';
    credBlob = '';
  }

  function cancelCredForm() {
    credEditId = '';
    credProvider = 'mpesa';
    credEnv = 'production';
    credLabel = '';
    credBlob = '';
  }

  async function runCredTest(id: string) {
    credTesting = id;
    credTestResult = null;
    const fd = new FormData();
    fd.set('id', id);
    const res = await fetch('?/credential-test', { method: 'POST', body: fd });
    const body = await res.json();
    credTestResult = { ok: body?.success, msg: body?.message ?? (body?.error ?? 'Test failed') };
    credTesting = null;
  }
</script>

<DashboardContent title="Platform Settings" subtitle="Operator-owned secrets for the whole platform (platform admin only)">
  <div class="space-y-6">
    {#if mpesaSecretValue || publicUrlValue}
    <p class="text-sm text-muted-foreground">Config values are encrypted at rest and only the platform admin can read them.</p>
    {/if}

    {#if credTestResult}
      <Alert variant={credTestResult.ok ? 'default' : 'destructive'}>
        <AlertTitle>{credTestResult.msg}</AlertTitle>
      </Alert>
    {/if}

    <!-- Platform config -->
    <Card>
      <CardContent class="space-y-5 pt-6">
        <div>
          <h3 class="text-sm font-semibold text-ink-900">Platform config</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            Used by the backend edge functions. Environment variables (if set) take precedence;
            these values are the in-app fallback and the recommended home for them.
          </p>
        </div>

        <!-- MPESA_CALLBACK_SECRET -->
        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex-1">
              <Label for="cfg-mpesa">M-Pesa callback secret</Label>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {configuredKeys.includes('mpesa_callback_secret')
                  ? 'Set — mpesa-callback and b2c-result validate against this shared secret.'
                  : 'Not set — callback edge functions fail closed (no payouts finalize).'}
              </p>
            </div>
            <div class="flex w-full items-end gap-2 sm:w-auto">
              <Input
                id="cfg-mpesa"
                type="password"
                bind:value={mpesaSecretValue}
                placeholder="e.g. a long random string"
                class="sm:w-72"
              />
              <Button size="sm" disabled={savingKey === 'mpesa_callback_secret' || !mpesaSecretValue}
                onclick={() => submitConfig('mpesa_callback_secret', mpesaSecretValue)}>
                {savingKey === 'mpesa_callback_secret' ? 'Saving...' : 'Save'}
              </Button>
              {#if configuredKeys.includes('mpesa_callback_secret')}
                <Button size="sm" variant="ghost" class="text-destructive"
                  disabled={removingKey === 'mpesa_callback_secret'}
                  onclick={() => removeConfig('mpesa_callback_secret')}>Clear</Button>
              {/if}
            </div>
          </div>
        </div>

        <!-- PUBLIC_URL -->
        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex-1">
              <Label for="cfg-url">Public base URL</Label>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {configuredKeys.includes('public_url')
                  ? `Set — callbacks are built from ${config.public_url}.`
                  : 'Not set — STK pushes and B2C payouts cannot be finalized (callback URL would be invalid).'}
                Used to build the M-Pesa callback and B2C result URLs.
              </p>
            </div>
            <div class="flex w-full items-end gap-2 sm:w-auto">
              <Input
                id="cfg-url"
                type="text"
                bind:value={publicUrlValue}
                placeholder="e.g. https://<project-ref>.functions.supabase.co"
                class="sm:w-96"
              />
              <Button size="sm" disabled={savingKey === 'public_url' || !publicUrlValue}
                onclick={() => submitConfig('public_url', publicUrlValue)}>
                {savingKey === 'public_url' ? 'Saving...' : 'Save'}
              </Button>
              {#if configuredKeys.includes('public_url')}
                <Button size="sm" variant="ghost" class="text-destructive"
                  disabled={removingKey === 'public_url'}
                  onclick={() => removeConfig('public_url')}>Clear</Button>
              {/if}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Platform credentials -->
    <Card>
      <CardContent class="space-y-5 pt-6">
        <div>
          <h3 class="text-sm font-semibold text-ink-900">Platform credentials</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            The operator's own M-Pesa / Mobiwave accounts (platform_billing scope). These are never used
            as a fallback for a tenant's sends — each school keeps its own credentials in Admin → Settings → Integrations.
          </p>
        </div>

        {#each credentials as cred (cred.id)}
          <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div>
              <p class="text-sm font-medium text-foreground">{cred.label || cred.provider}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {cred.provider === 'mpesa' ? 'M-Pesa (Daraja)' : 'Mobiwave SMS'} · {cred.environment} ·
                <span class="font-medium text-foreground/70">{cred.test_status ?? 'untested'}</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Button size="sm" variant="secondary" onclick={() => runCredTest(cred.id)} disabled={credTesting === cred.id}>
                {credTesting === cred.id ? 'Testing…' : 'Test'}
              </Button>
              <Button size="sm" variant="outline" onclick={() => openCredEdit(cred)}>Edit</Button>
              <form method="POST" action="?/credential-delete" class="inline">
                <input type="hidden" name="id" value={cred.id} />
                <Button type="submit" size="sm" variant="ghost" class="text-destructive">Delete</Button>
              </form>
            </div>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">No platform credentials configured yet. Add the first one below.</p>
        {/each}

        <Separator />

        <form method="POST" action="?/credential-save" use:enhance={() => {
          credSaving = true;
          return async () => { credSaving = false; };
        }}>
          <h3 class="mb-4 text-sm font-semibold text-foreground">{credEditId ? 'Edit Platform Credential' : 'Add Platform Credential'}</h3>
          {#if credEditId}
            <input type="hidden" name="id" value={credEditId} />
          {/if}
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="space-y-2">
                <Label for="cred-provider">Provider</Label>
                <select
                  id="cred-provider" name="provider" bind:value={credProvider}
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="mpesa">M-Pesa (Daraja)</option>
                  <option value="mobiwave_sms">Mobiwave SMS</option>
                </select>
              </div>
              <div class="space-y-2">
                <Label for="cred-env">Environment</Label>
                <select
                  id="cred-env" name="environment" bind:value={credEnv}
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div class="space-y-2">
                <Label for="cred-label">Label</Label>
                <Input id="cred-label" name="label" type="text" bind:value={credLabel} placeholder="e.g. eShule Ops Daraja" />
              </div>
            </div>
            <div class="space-y-2">
              <Label for="cred-blob">
                {credProvider === 'mpesa' ? 'JSON Blob (consumer_key, consumer_secret, passkey, shortcode, initiator_name, security_credential)' : 'API Token'}
              </Label>
              <textarea
                id="cred-blob" name="encrypted_blob" bind:value={credBlob} rows={4}
                class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                placeholder={credProvider === 'mpesa' ? '{"consumer_key":"...","consumer_secret":"...","passkey":"...","shortcode":"...","initiator_name":"...","security_credential":"..."}' : '{"api_token":"..."}'}
                required
              ></textarea>
              <p class="text-xs text-muted-foreground">
                {credProvider === 'mpesa'
                  ? 'Operator-level Daraja account. Encrypted at rest; decrypted only by the backend.'
                  : 'This data is encrypted before storage.'}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <Button type="submit" disabled={credSaving}>{credSaving ? 'Saving...' : credEditId ? 'Update Credential' : 'Save Credential'}</Button>
              {#if credEditId}
                <Button type="button" variant="outline" onclick={cancelCredForm}>Cancel</Button>
              {/if}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</DashboardContent>
