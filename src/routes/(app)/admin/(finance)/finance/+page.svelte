<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { enhance } from '$app/forms';

  const { data } = $props();
  const s = $derived(data.stats);
  let bankForm = $state({ invoice_id: '', amount: '', bank_reference: '', bank_name: 'KCB', received_at: '' });
  let bankMsg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let bankSubmitting = $state(false);

  function handleBankSubmit() {
    bankSubmitting = true;
    bankMsg = null;
    return async ({ result, update }: { result: any; update: (_o?: any) => void }) => {
      try {
        if (result.type === 'failure') bankMsg = { type: 'error', text: result.data?.message ?? 'Failed to record payment.' };
        if (result.type === 'success') {
          bankMsg = { type: 'success', text: result.data?.message ?? 'Bank payment recorded.' };
          bankForm = { invoice_id: '', amount: '', bank_reference: '', bank_name: 'KCB', received_at: '' };
        }
        await update();
      } finally {
        bankSubmitting = false;
      }
    };
  }
</script>

<DashboardContent title="Bursar & Finance" subtitle="Income and expense tracking">
  {#snippet headerActions()}
    <a href="/admin/parent-payments">
      <Button variant="secondary" size="sm">Payment Details</Button>
    </a>
    <a href="/admin/finance/income">
      <Button variant="primary" size="sm">Record Income</Button>
    </a>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <KpiCard label="Total Invoiced" value={`KES ${s.totalInvoiced.toLocaleString()}`} sub="School fee invoices" />
    <KpiCard label="Collected (12mo)" value={`KES ${s.totalCollected.toLocaleString()}`} sub={`${s.totalTransactions} transactions`} />
    <KpiCard label="Invoice Status" value={`${s.paidInvoices} paid`} sub={`${s.pendingInvoices} unpaid, ${s.partialInvoices} partial`} />
  </div>

  <!-- KCB/Buni bank payment entry -->
  <div class="mt-8 rounded-xl border border-border bg-white p-5 shadow-card">
    <h3 class="text-sm font-semibold text-ink-900">Record KCB / Buni Bank Payment</h3>
    <p class="mt-1 text-xs text-ink-500">School fees paid via bank transfer. Remedial fees are paid separately by parents via M-Pesa paybill.</p>
    {#if bankMsg}
      <div class="mt-3 rounded-lg px-4 py-2 text-sm {bankMsg.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-danger'}">{bankMsg.text}</div>
    {/if}
    <form method="POST" action="?/record-bank" use:enhance={handleBankSubmit} class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div class="space-y-1.5">
        <label for="invoice_id" class="text-xs font-medium text-ink-700">Invoice ID</label>
        <input id="invoice_id" name="invoice_id" bind:value={bankForm.invoice_id} required class="w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="invoice uuid" />
      </div>
      <div class="space-y-1.5">
        <label for="amount" class="text-xs font-medium text-ink-700">Amount (KES)</label>
        <input id="amount" name="amount" type="number" step="0.01" bind:value={bankForm.amount} required class="w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="0.00" />
      </div>
      <div class="space-y-1.5">
        <label for="bank_reference" class="text-xs font-medium text-ink-700">Bank Reference</label>
        <input id="bank_reference" name="bank_reference" bind:value={bankForm.bank_reference} required class="w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="KCB receipt / ref" />
      </div>
      <div class="space-y-1.5">
        <label for="bank_name" class="text-xs font-medium text-ink-700">Bank</label>
        <input id="bank_name" name="bank_name" bind:value={bankForm.bank_name} class="w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="KCB" />
      </div>
      <div class="flex items-end">
        <Button type="submit" variant="primary" size="md" disabled={bankSubmitting}>{bankSubmitting ? 'Recording…' : 'Record'}</Button>
      </div>
    </form>
  </div>

  <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/admin/parent-payments"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m13.5-1.5v.75a.75.75 0 0 1-.75.75h-.75" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Parent Payments</h3>
        <p class="mt-1 text-xs text-ink-500">View all parent invoice payments and M-Pesa transactions.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-rose-700 group-hover:text-rose-800">
        View Details
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/finance/income"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Income Records</h3>
        <p class="mt-1 text-xs text-ink-500">Track school income sources beyond parent fees.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
        Manage Income
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/finance/expenses"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Expenses</h3>
        <p class="mt-1 text-xs text-ink-500">Record and track school operating expenses.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-amber-700 group-hover:text-amber-800">
        Manage Expenses
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/reports"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Financial Reports</h3>
        <p class="mt-1 text-xs text-ink-500">Revenue CSV and financial summary exports.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-slate-700 group-hover:text-slate-800">
        View Reports
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
  </div>
</DashboardContent>
