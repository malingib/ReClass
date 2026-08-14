<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { enhance } from '$app/forms';

  const { data, form } = $props();
  const tenant = $derived(data.tenant!);
  const settings = $derived<Record<string, any>>((data.tenant?.settings ?? {}) as Record<string, any>);

  let saving = $state(false);
  const terms = $derived((data.terms ?? []) as { id: string; name: string; start_date: string | null; end_date: string | null; is_current: boolean }[]);
  const currentTermId = $derived(data.tenant?.current_term_id ?? null);
  const credentials = $derived((data.credentials ?? []) as any[]);
  let credEditId = $state<string | null>(null);
  let credProvider = $state('mpesa');
  let credEnv = $state('sandbox');
  let credLabel = $state('');
  let credBlob = $state('');
  let credSaving = $state(false);
  let credTesting = $state<string | null>(null);
  let credTestResult = $state<{ id: string; ok: boolean; msg: string } | null>(null);

  function openCredEdit(item: any) {
    credEditId = item.id;
    credProvider = item.provider;
    credEnv = item.environment;
    credLabel = item.label;
    credBlob = '';
  }

  function cancelCredForm() {
    credEditId = null;
  }

  async function runCredTest(id: string) {
    credTesting = id;
    credTestResult = null;
    const formData = new FormData();
    formData.set('id', id);
    const res = await fetch('?/credential-test', { method: 'POST', body: formData });
    const result = await res.json();
    credTesting = null;
    if (result?.success) {
      credTestResult = { id, ok: result.testResult === 'ok', msg: result.message };
    } else {
      credTestResult = { id, ok: false, msg: result?.error ?? 'Test failed' };
    }
  }
</script>

<DashboardContent title="Settings" subtitle="School configuration and preferences">
  {#if form?.success}
    <Alert variant="default" class="border-success/30 bg-success/5">
      <AlertTitle>Settings saved successfully.</AlertTitle>
    </Alert>
  {/if}
  {#if form?.error}
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{form.error}</AlertDescription>
    </Alert>
  {/if}

  <form method="POST" action="?/save" use:enhance={() => {
    saving = true;
    return async () => { saving = false; };
  }}>
    <Tabs value="school" class="space-y-6">
      <TabsList class="grid w-full grid-cols-5">
        <TabsTrigger value="school">School Profile</TabsTrigger>
        <TabsTrigger value="academic">Academic</TabsTrigger>
        <TabsTrigger value="financial">Financial</TabsTrigger>
        <TabsTrigger value="channels">Payment Channels</TabsTrigger>
        <TabsTrigger value="sms">SMS Toggles</TabsTrigger>
      </TabsList>

      <TabsContent value="school">
        <Card>
          <CardContent class="space-y-5 pt-6">
            <div class="space-y-2">
              <Label for="name">School Name</Label>
              <Input id="name" name="name" type="text" value={tenant.name} placeholder="e.g. Moi Girls High School" required />
            </div>
            <div class="space-y-2">
              <Label for="logo_url">Logo URL</Label>
              <Input id="logo_url" name="logo_url" type="text" value={tenant.logo_url ?? ''} placeholder="https://example.com/logo.png" />
            </div>
            <div class="space-y-2">
              <Label for="brand_primary">Brand Colour</Label>
              <div class="flex items-center gap-3">
                <input id="brand_primary" name="brand_primary" type="color" value={tenant.brand_primary ?? '#12b76a'} class="h-10 w-10 cursor-pointer rounded-lg border border-input" />
                <Input type="text" value={tenant.brand_primary ?? '#12b76a'} class="w-32" readonly />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="timezone">Timezone</Label>
                <select id="timezone" name="timezone" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="Africa/Nairobi" selected={tenant.timezone === 'Africa/Nairobi'}>Africa/Nairobi (EAT)</option>
                  <option value="Africa/Kampala" selected={tenant.timezone === 'Africa/Kampala'}>Africa/Kampala (EAT)</option>
                  <option value="Africa/Dar_es_Salaam" selected={tenant.timezone === 'Africa/Dar_es_Salaam'}>Africa/Dar es Salaam (EAT)</option>
                  <option value="Africa/Lagos" selected={tenant.timezone === 'Africa/Lagos'}>Africa/Lagos (WAT)</option>
                  <option value="UTC" selected={tenant.timezone === 'UTC'}>UTC</option>
                </select>
              </div>
              <div class="space-y-2">
                <Label for="currency">Currency</Label>
                <select id="currency" name="currency" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="KES" selected={tenant.currency === 'KES'}>KES — Kenyan Shilling</option>
                  <option value="UGX" selected={tenant.currency === 'UGX'}>UGX — Ugandan Shilling</option>
                  <option value="TZS" selected={tenant.currency === 'TZS'}>TZS — Tanzanian Shilling</option>
                  <option value="NGN" selected={tenant.currency === 'NGN'}>NGN — Nigerian Naira</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="academic">
        <Card>
          <CardContent class="space-y-5 pt-6">
            <div class="space-y-2">
              <Label for="academic_year">Academic Year</Label>
              <Input id="academic_year" name="academic_year" type="text" value={tenant.academic_year ?? ''} placeholder="e.g. 2025" />
            </div>
            <div class="space-y-2">
              <Label for="payroll_rate_per_session">Payroll Rate per Session (KES)</Label>
              <Input id="payroll_rate_per_session" name="payroll_rate_per_session" type="number" step="0.01" min="0" value={tenant.payroll_rate_per_session ?? 0} class="max-w-xs" placeholder="0.00" />
              <p class="text-xs text-muted-foreground">The flat rate paid per attended remedial session.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="financial">
        <Card>
          <CardContent class="space-y-5 pt-6">
            <div class="space-y-2">
              <Label for="mpesa_shortcode">M-Pesa Shortcode</Label>
              <Input id="mpesa_shortcode" name="mpesa_shortcode" type="text" value={tenant.mpesa_shortcode ?? ''} class="max-w-xs" placeholder="e.g. 123456" />
            </div>
            <div class="space-y-2">
              <Label for="mpesa_paybill">M-Pesa Paybill Number</Label>
              <Input id="mpesa_paybill" name="mpesa_paybill" type="text" value={tenant.mpesa_paybill ?? ''} class="max-w-xs" placeholder="e.g. 654321" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="channels">
        <Card>
          <CardContent class="space-y-6 pt-6">
            <p class="text-sm text-muted-foreground">
              Each domain uses <strong>one</strong> payment channel — either bank (KCB) or M-Pesa paybill.
              Parents pay for school fees and remedials through the configured channel for that domain.
            </p>

            <div class="rounded-lg border p-4">
              <span class="text-sm font-medium text-foreground">School Fees channel</span>
              <p class="mb-3 text-xs text-muted-foreground">Termly school fee payments collected via this channel.</p>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="school_payment_channel" value="bank" checked={tenant.school_payment_channel === 'bank'} class="text-primary" />
                  Bank (KCB / Buni)
                </label>
                <label class="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="school_payment_channel" value="mpesa" checked={tenant.school_payment_channel === 'mpesa'} class="text-primary" />
                  M-Pesa paybill
                </label>
              </div>
            </div>

            <div class="rounded-lg border p-4">
              <span class="text-sm font-medium text-foreground">Remedial Fees channel</span>
              <p class="mb-3 text-xs text-muted-foreground">Remedial fees collected via this channel.</p>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="remedial_payment_channel" value="bank" checked={tenant.remedial_payment_channel === 'bank'} class="text-primary" />
                  Bank (KCB / Buni)
                </label>
                <label class="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="remedial_payment_channel" value="mpesa" checked={tenant.remedial_payment_channel === 'mpesa'} class="text-primary" />
                  M-Pesa paybill
                </label>
              </div>
            </div>

            <Separator />

            <div class="rounded-lg border p-4">
              <h4 class="text-sm font-medium text-foreground">Bank details (KCB / Buni)</h4>
              <p class="mb-3 text-xs text-muted-foreground">Shown to parents and used for bank receipts when a domain uses the bank channel.</p>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label for="kcb_bank_name">Bank name</Label>
                  <Input id="kcb_bank_name" name="kcb_bank_name" type="text" value={tenant.kcb_bank_name ?? 'KCB'} />
                </div>
                <div class="space-y-2">
                  <Label for="kcb_account_no">Account number</Label>
                  <Input id="kcb_account_no" name="kcb_account_no" type="text" value={tenant.kcb_account_no ?? ''} />
                </div>
                <div class="space-y-2">
                  <Label for="buni_shortcode">Buni shortcode</Label>
                  <Input id="buni_shortcode" name="buni_shortcode" type="text" value={tenant.buni_shortcode ?? ''} placeholder="e.g. 234567" />
                </div>
              </div>
            </div>

            <div class="rounded-lg border p-4">
              <h4 class="text-sm font-medium text-foreground">M-Pesa details (paybill)</h4>
              <p class="mb-3 text-xs text-muted-foreground">
                Paybill number shown to parents for M-Pesa domains. The account reference is the student's
                <strong>admission number</strong> (max 12 characters). Live M-Pesa API credentials are managed
                under Integrations > Mobiwave & Daraja.
              </p>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label for="mpesa_shortcode">M-Pesa Shortcode</Label>
                  <Input id="mpesa_shortcode" name="mpesa_shortcode" type="text" value={tenant.mpesa_shortcode ?? ''} placeholder="e.g. 123456" />
                </div>
                <div class="space-y-2">
                  <Label for="mpesa_paybill">M-Pesa Paybill Number</Label>
                  <Input id="mpesa_paybill" name="mpesa_paybill" type="text" value={tenant.mpesa_paybill ?? ''} placeholder="e.g. 654321" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sms">
        <Card>
          <CardContent class="space-y-5 pt-6">
            <p class="text-sm text-muted-foreground">Control teacher alerts and which SMS notifications are sent to parents.</p>
            <label class="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50">
              <input type="checkbox" name="sms_attendance" checked={settings.sms_attendance ?? true} class="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
              <div>
                <p class="text-sm font-medium text-foreground">Teacher Attendance SMS</p>
                <p class="text-xs text-muted-foreground">In-app alert when a teacher is marked absent/late for a remedial session</p>
              </div>
            </label>
            <label class="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50">
              <input type="checkbox" name="sms_payment_reminder" checked={settings.sms_payment_reminder ?? true} class="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
              <div>
                <p class="text-sm font-medium text-foreground">Payment Reminder SMS</p>
                <p class="text-xs text-muted-foreground">Send SMS reminders before due dates</p>
              </div>
            </label>
            <label class="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50">
              <input type="checkbox" name="sms_payment_receipt" checked={settings.sms_payment_receipt ?? true} class="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
              <div>
                <p class="text-sm font-medium text-foreground">Payment Receipt SMS</p>
                <p class="text-xs text-muted-foreground">Send SMS receipt on successful M-Pesa payment</p>
              </div>
            </label>
            <label class="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50">
              <input type="checkbox" name="sms_teacher_payout" checked={settings.sms_teacher_payout ?? true} class="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
              <div>
                <p class="text-sm font-medium text-foreground">Teacher Payout SMS</p>
                <p class="text-xs text-muted-foreground">Send SMS to a teacher when their remedial payout clears via M-Pesa B2C</p>
              </div>
            </label>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <div class="mt-6 flex justify-end">
      <Button type="submit" disabled={saving}>
        {#if saving}
          <svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving...
        {:else}
          Save Settings
        {/if}
      </Button>
    </div>
  </form>

  <div class="mt-10">
    <Tabs value="terms" class="space-y-6">
      <TabsList class="grid w-full grid-cols-1 sm:grid-cols-3">
        <TabsTrigger value="terms">Academic Terms</TabsTrigger>
        <TabsTrigger value="roles">Remedial Committee Roles</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      <TabsContent value="terms">
        <Card>
          <CardContent class="space-y-5 pt-6">
            <p class="text-sm text-muted-foreground">
              Terms anchor remedial fees and payouts. The current term is used to compute parent obligations
              and is referenced by payment reminders.
            </p>

            {#if terms.length === 0}
              <p class="text-sm text-muted-foreground">No terms yet. Create the first term below.</p>
            {/if}

            <div class="space-y-2">
              {#each terms as term (term.id)}
                <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p class="text-sm font-medium text-foreground">
                      {term.name}
                      {#if term.id === currentTermId}
                        <span class="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Current</span>
                      {/if}
                    </p>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      {term.start_date ?? '—'} – {term.end_date ?? '—'}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    {#if term.id !== currentTermId}
                      <form method="POST" action="?/term-set-current" class="inline">
                        <input type="hidden" name="id" value={term.id} />
                        <Button type="submit" variant="outline" size="sm">Set Current</Button>
                      </form>
                    {/if}
                    <form method="POST" action="?/term-delete" class="inline">
                      <input type="hidden" name="id" value={term.id} />
                      <Button type="submit" variant="ghost" size="sm" class="text-destructive">Delete</Button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>

            <Separator />

            <form method="POST" action="?/term-create" class="space-y-4">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div class="space-y-2">
                  <Label for="term_name">Term Name</Label>
                  <Input id="term_name" name="name" type="text" placeholder="e.g. Term 1, 2026" required />
                </div>
                <div class="space-y-2">
                  <Label for="term_start">Start Date</Label>
                  <Input id="term_start" name="start_date" type="date" />
                </div>
                <div class="space-y-2">
                  <Label for="term_end">End Date</Label>
                  <Input id="term_end" name="end_date" type="date" />
                </div>
              </div>
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name="make_current" value="on" class="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
                Set as current term
              </label>
              <Button type="submit" size="sm">Create Term</Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="integrations">
        <Card>
          <CardContent class="space-y-5 pt-6">
            <p class="text-sm text-muted-foreground">
              M-Pesa (Daraja) powers parent STK payments and teacher B2C payouts. Mobiwave powers SMS alerts.
              Credentials are encrypted before storage and decrypted only at send time by the backend.
            </p>

            {#if credTestResult}
              <Alert variant={credTestResult.ok ? 'default' : 'destructive'}>
                <AlertTitle>{credTestResult.msg}</AlertTitle>
              </Alert>
            {/if}

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
                    {#if credTesting === cred.id}
                      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    {:else}
                      Test
                    {/if}
                  </Button>
                  <Button size="sm" variant="outline" onclick={() => openCredEdit(cred)}>Edit</Button>
                  <form method="POST" action="?/credential-delete" class="inline">
                    <input type="hidden" name="id" value={cred.id} />
                    <Button type="submit" size="sm" variant="ghost" class="text-destructive">Delete</Button>
                  </form>
                </div>
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">No credentials configured yet. Add the first one below.</p>
            {/each}

            <Separator />

            <form method="POST" action="?/credential-save" use:enhance={() => {
              credSaving = true;
              return async () => { credSaving = false; };
            }}>
              <h3 class="mb-4 text-sm font-semibold text-foreground">{credEditId ? 'Edit Credential' : 'Add Credential'}</h3>
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
                    <Input id="cred-label" name="label" type="text" bind:value={credLabel} placeholder="e.g. Production Daraja" />
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
                      ? 'B2C teacher payouts require initiator_name (Daraja initiator username) and security_credential (RSA-encrypted initiator password). Stored encrypted at rest.'
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
      </TabsContent>
    </Tabs>
  </div>
</DashboardContent>
