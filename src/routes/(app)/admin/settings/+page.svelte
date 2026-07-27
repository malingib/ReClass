<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { enhance } from '$app/forms';
  import Card from '$lib/components/ui/card.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';

  const { data, form } = $props();
  const tenant = $derived(data.tenant!);
  const settings = $derived<Record<string, any>>((data.tenant?.settings ?? {}) as Record<string, any>);

  let activeTab = $state<'school' | 'academic' | 'financial' | 'sms'>('school');
  let saving = $state(false);

  const tabs = [
    { id: 'school', label: 'School Profile' },
    { id: 'academic', label: 'Academic' },
    { id: 'financial', label: 'Financial' },
    { id: 'sms', label: 'SMS Toggles' },
  ] as const;
</script>

<DashboardContent title="Settings" subtitle="School configuration and preferences">
  {#if form?.success}
    <div class="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
      Settings saved successfully.
    </div>
  {/if}
  {#if form?.error}
    <div class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  <form method="POST" action="?/save" use:enhance={() => {
    saving = true;
    return async () => { saving = false; };
  }}>
    <div class="mb-6 flex gap-1 rounded-xl border border-border bg-ink-50/70 p-1">
      {#each tabs as tab}
        <button
          type="button"
          onclick={() => activeTab = tab.id}
          class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all {activeTab === tab.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <Card>
      <CardContent>
        {#if activeTab === 'school'}
          <div class="space-y-5">
            <div>
              <label for="name" class="mb-1.5 block text-sm font-medium text-ink-700">School Name</label>
              <input
                id="name" name="name" type="text" value={tenant.name}
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="e.g. Moi Girls High School"
                required
              />
            </div>
            <div>
              <label for="logo_url" class="mb-1.5 block text-sm font-medium text-ink-700">Logo URL</label>
              <input
                id="logo_url" name="logo_url" type="text" value={tenant.logo_url ?? ''}
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <label for="brand_primary" class="mb-1.5 block text-sm font-medium text-ink-700">Brand Colour</label>
              <div class="flex items-center gap-3">
                <input
                  id="brand_primary" name="brand_primary" type="color" value={tenant.brand_primary ?? '#12b76a'}
                  class="h-10 w-10 cursor-pointer rounded-lg border border-ink-200"
                />
                <input
                  type="text" value={tenant.brand_primary ?? '#12b76a'}
                  class="w-32 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 focus:border-brand-500 focus:outline-none"
                  readonly
                />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label for="timezone" class="mb-1.5 block text-sm font-medium text-ink-700">Timezone</label>
                <select
                  id="timezone" name="timezone"
                  class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="Africa/Nairobi" selected={tenant.timezone === 'Africa/Nairobi'}>Africa/Nairobi (EAT)</option>
                  <option value="Africa/Kampala" selected={tenant.timezone === 'Africa/Kampala'}>Africa/Kampala (EAT)</option>
                  <option value="Africa/Dar_es_Salaam" selected={tenant.timezone === 'Africa/Dar_es_Salaam'}>Africa/Dar es Salaam (EAT)</option>
                  <option value="Africa/Lagos" selected={tenant.timezone === 'Africa/Lagos'}>Africa/Lagos (WAT)</option>
                  <option value="UTC" selected={tenant.timezone === 'UTC'}>UTC</option>
                </select>
              </div>
              <div>
                <label for="currency" class="mb-1.5 block text-sm font-medium text-ink-700">Currency</label>
                <select
                  id="currency" name="currency"
                  class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="KES" selected={tenant.currency === 'KES'}>KES — Kenyan Shilling</option>
                  <option value="UGX" selected={tenant.currency === 'UGX'}>UGX — Ugandan Shilling</option>
                  <option value="TZS" selected={tenant.currency === 'TZS'}>TZS — Tanzanian Shilling</option>
                  <option value="NGN" selected={tenant.currency === 'NGN'}>NGN — Nigerian Naira</option>
                </select>
              </div>
            </div>
          </div>
        {/if}

        {#if activeTab === 'academic'}
          <div class="space-y-5">
            <div>
              <label for="academic_year" class="mb-1.5 block text-sm font-medium text-ink-700">Academic Year</label>
              <input
                id="academic_year" name="academic_year" type="text" value={tenant.academic_year ?? ''}
                class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="e.g. 2025"
              />
            </div>
            <div>
              <label for="payroll_rate_per_session" class="mb-1.5 block text-sm font-medium text-ink-700">
                Payroll Rate per Session (KES)
              </label>
              <input
                id="payroll_rate_per_session" name="payroll_rate_per_session" type="number" step="0.01" min="0"
                value={tenant.payroll_rate_per_session ?? 0}
                class="w-full max-w-xs rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="0.00"
              />
              <p class="mt-1 text-xs text-ink-400">The flat rate paid per attended remedial session.</p>
            </div>
          </div>
        {/if}

        {#if activeTab === 'financial'}
          <div class="space-y-5">
            <div>
              <label for="mpesa_shortcode" class="mb-1.5 block text-sm font-medium text-ink-700">M-Pesa Shortcode</label>
              <input
                id="mpesa_shortcode" name="mpesa_shortcode" type="text" value={tenant.mpesa_shortcode ?? ''}
                class="w-full max-w-xs rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="e.g. 123456"
              />
            </div>
            <div>
              <label for="mpesa_paybill" class="mb-1.5 block text-sm font-medium text-ink-700">M-Pesa Paybill Number</label>
              <input
                id="mpesa_paybill" name="mpesa_paybill" type="text" value={tenant.mpesa_paybill ?? ''}
                class="w-full max-w-xs rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="e.g. 654321"
              />
            </div>
          </div>
        {/if}

        {#if activeTab === 'sms'}
          <div class="space-y-5">
            <p class="text-sm text-ink-500">Control teacher alerts and which SMS notifications are sent to parents.</p>
            <label class="flex items-center gap-3 rounded-lg border border-ink-200 p-4 hover:bg-ink-50/50">
              <input
                type="checkbox" name="sms_attendance"
                checked={settings.sms_attendance ?? true}
                class="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p class="text-sm font-medium text-ink-700">Teacher Attendance SMS</p>
                <p class="text-xs text-ink-400">In-app alert when a teacher is marked absent/late for a remedial session</p>
              </div>
            </label>
            <label class="flex items-center gap-3 rounded-lg border border-ink-200 p-4 hover:bg-ink-50/50">
              <input
                type="checkbox" name="sms_payment_reminder" 
                checked={settings.sms_payment_reminder ?? true}
                class="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p class="text-sm font-medium text-ink-700">Payment Reminder SMS</p>
                <p class="text-xs text-ink-400">Send SMS reminders before due dates</p>
              </div>
            </label>
            <label class="flex items-center gap-3 rounded-lg border border-ink-200 p-4 hover:bg-ink-50/50">
              <input
                type="checkbox" name="sms_payment_receipt"
                checked={settings.sms_payment_receipt ?? true}
                class="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p class="text-sm font-medium text-ink-700">Payment Receipt SMS</p>
                <p class="text-xs text-ink-400">Send SMS receipt on successful M-Pesa payment</p>
              </div>
            </label>
          </div>
        {/if}
      </CardContent>
    </Card>

    <div class="mt-6 flex justify-end">
      <Button type="submit" variant="primary" loading={saving}>Save Settings</Button>
    </div>
  </form>
</DashboardContent>
