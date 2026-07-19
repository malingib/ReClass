<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();

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
    const invoiceId = data.get('invoice_id') as string;

    try {
      const { error: fnErr } = await getSupabase().functions.invoke('stk', {
        body: { invoice_id: invoiceId },
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
        <label for="invoice-id" class="text-sm font-medium text-ink-700">Outstanding invoice</label>
        <select id="invoice-id" name="invoice_id" required class="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
          <option value="">Select an invoice</option>
          {#each data.invoices as invoice}
            <option value={invoice.id}>
              {invoice.students?.first_name} {invoice.students?.last_name} · KES {(Number(invoice.amount_due) - Number(invoice.amount_paid ?? 0)).toLocaleString()}
            </option>
          {/each}
        </select>
      </div>
      <div class="rounded-lg border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-600">
        M-Pesa prompt: <strong>{data.parent.phone}</strong>. The outstanding invoice balance is calculated by the school ledger.
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
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">1</span> Select one of your outstanding school invoices.</li>
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">2</span> We send an STK push to your phone via the school paybill. Enter your M-Pesa PIN to confirm.</li>
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">3</span> The invoice updates automatically once M-Pesa calls back. You receive a Mobiwave SMS receipt.</li>
      </ol>
    </div>
  </div>
</DashboardContent>
