<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  let loading = $state(false);
  let success = $state<string | null>(null);
  let error = $state<string | null>(null);

  async function handlePay(e: Event) {
    e.preventDefault();
    error = null;
    success = null;
    loading = true;
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const studentId = data.get('student_id') as string;
    const amount = data.get('amount') as string;
    const phone = data.get('phone') as string;

    if (!/^254[17]\d{8}$/.test(phone.replace(/\s/g, ''))) {
      error = 'Enter a valid M-Pesa phone number (e.g. 254712345678)';
      loading = false;
      return;
    }

    try {
      const { error: fnErr } = await getSupabase().functions.invoke('stk', {
        body: { invoice_id: studentId, tenant_id: '', amount: Number(amount), phone: phone.replace(/\s/g, '') },
      });
      if (fnErr) throw fnErr;
      success = 'M-Pesa STK Push sent. Check your phone to confirm the paybill prompt.';
      form.reset();
    } catch (e) {
      error = 'Payment request failed. Please try again or contact the school.';
    } finally {
      loading = false;
    }
  }
</script>

<DashboardContent title="Pay remedial fees" subtitle="Triggers an M-Pesa STK push to your phone via the school paybill">
  <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
    <form onsubmit={handlePay} class="space-y-4 rounded-xl border border-border bg-white p-6 shadow-card">
      {#if success}
        <div class="rounded-md bg-success/10 p-3 text-sm text-success">{success}</div>
      {/if}
      {#if error}
        <div class="rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</div>
      {/if}
      <div>
        <label for="student-id" class="text-sm font-medium text-ink-700">Child admission number</label>
        <input id="student-id" name="student_id" required placeholder="e.g. MLG-2024-081" class="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
      </div>
      <div>
        <label for="amount" class="text-sm font-medium text-ink-700">Amount (KES)</label>
        <input id="amount" name="amount" type="number" required placeholder="1500" class="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
      </div>
      <div>
        <label for="phone" class="text-sm font-medium text-ink-700">M-Pesa phone</label>
        <input id="phone" name="phone" type="tel" required placeholder="07XXXXXXXX" class="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
      </div>
      <button type="submit" disabled={loading} class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">
        {#if loading}
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        {/if}
        {loading ? 'Sending STK push…' : 'Pay via M-Pesa'}
      </button>
      <p class="text-xs text-ink-500">Funds are settled at the school paybill. Confirmation arrives by SMS via Mobiwave.</p>
    </form>
    <div class="space-y-3 rounded-xl border border-brand-200 bg-brand-50/60 p-6 shadow-card">
      <h3 class="text-sm font-semibold text-ink-900">How payment works</h3>
      <ol class="space-y-3 text-sm text-ink-600">
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">1</span> Enter your child's admission number, the amount to pay, and your M-Pesa phone.</li>
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">2</span> We send an STK push to your phone via the school paybill. Enter your M-Pesa PIN to confirm.</li>
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">3</span> The invoice updates automatically once M-Pesa calls back. You receive a Mobiwave SMS receipt.</li>
      </ol>
    </div>
  </div>
</DashboardContent>
