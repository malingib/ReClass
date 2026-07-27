<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();

  let selectedInvoiceId = $state('');
  let loading = $state(false);
  let polling = $state(false);
  let success = $state<string | null>(null);
  let error = $state<string | null>(null);

  const selectedInvoice = $derived(
    data.invoices.find((i: any) => i.id === selectedInvoiceId) ?? null
  );
  const balance = $derived(
    selectedInvoice
      ? Number(selectedInvoice.amount_due) - Number(selectedInvoice.amount_paid ?? 0)
      : 0
  );

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function startPolling(invoiceId: string) {
    polling = true;
    let attempts = 0;
    pollTimer = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/parent/pay/status?invoice_id=${invoiceId}`);
        const status = await res.json();
        if (status.status === 'completed') {
          success = 'Payment confirmed! Invoice has been updated.';
          polling = false;
          if (pollTimer) clearInterval(pollTimer);
          selectedInvoiceId = '';
        } else if (status.status === 'failed') {
          error = 'Payment failed. Please try again or contact the school.';
          polling = false;
          if (pollTimer) clearInterval(pollTimer);
        }
      } catch {
        // ignore poll errors
      }
      if (attempts > 20) {
        polling = false;
        if (pollTimer) clearInterval(pollTimer);
        if (!success) {
          error = 'Still waiting for confirmation. Check your phone for the M-Pesa prompt.';
        }
      }
    }, 3000);
  }

  async function handlePay(e: Event) {
    e.preventDefault();
    if (!selectedInvoiceId) return;
    error = null;
    success = null;
    loading = true;

    try {
      const { error: fnErr } = await getSupabase().functions.invoke('stk', {
        body: { invoice_id: selectedInvoiceId },
      });
      if (fnErr) throw fnErr;
      loading = false;
      startPolling(selectedInvoiceId);
    } catch {
      loading = false;
      error = 'Payment request failed. Please try again or contact the school.';
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
        <select id="invoice-id" name="invoice_id" bind:value={selectedInvoiceId} required disabled={loading || polling}
          class="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:opacity-50">
          <option value="">Select an invoice</option>
          {#each data.invoices as invoice}
            <option value={invoice.id}>
              {invoice.students?.first_name} {invoice.students?.last_name} · KES {(Number(invoice.amount_due) - Number(invoice.amount_paid ?? 0)).toLocaleString()}
            </option>
          {/each}
        </select>
      </div>

      {#if selectedInvoice}
        <div class="rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-3 space-y-1.5">
          <p class="text-sm font-semibold text-ink-900">Payment Summary</p>
          <p class="text-sm text-ink-600">Student: <strong>{selectedInvoice.students?.first_name} {selectedInvoice.students?.last_name}</strong></p>
          <p class="text-sm text-ink-600">Amount: <strong>KES {balance.toLocaleString()}</strong></p>
          <p class="text-sm text-ink-600">M-Pesa phone: <strong>{data.parent.phone}</strong></p>
        </div>
      {/if}

      <button type="submit" disabled={!selectedInvoiceId || loading || polling}
        class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">
        {#if loading}
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Sending STK push…
        {:else if polling}
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Waiting for confirmation…
        {:else}
          Pay via M-Pesa
        {/if}
      </button>

      {#if polling}
        <div class="rounded-md bg-warning/10 p-3 text-xs text-warning">
          Waiting for M-Pesa confirmation. Check your phone for the STK prompt and enter your PIN.
        </div>
      {/if}

      <p class="text-xs text-ink-500">Funds are settled at the school paybill. Confirmation arrives by SMS via Mobiwave.</p>
    </form>

    <div class="space-y-3 rounded-xl border border-brand-200 bg-brand-50/60 p-6 shadow-card">
      <h3 class="text-sm font-semibold text-ink-900">How payment works</h3>
      <ol class="space-y-3 text-sm text-ink-600">
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">1</span> Select one of your outstanding school invoices.</li>
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">2</span> Review the amount and phone number, then tap <strong>Pay via M-Pesa</strong>.</li>
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">3</span> Enter your M-Pesa PIN when prompted. The page will auto-confirm once the payment is received.</li>
      </ol>
    </div>
  </div>
</DashboardContent>
