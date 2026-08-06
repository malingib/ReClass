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
</DashboardContent>
