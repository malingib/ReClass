<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { enhance } from '$app/forms';

  const { data } = $props();
  const s = $derived(data.stats);
  const feeTypes = $derived(data.feeTypes ?? []);
  let bankForm = $state({ student_id: '', fee_type_id: '', amount: '', bank_reference: '', bank_name: 'KCB', received_at: '' });
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
          bankForm = { student_id: '', fee_type_id: '', amount: '', bank_reference: '', bank_name: 'KCB', received_at: '' };
        }
        await update();
      } finally {
        bankSubmitting = false;
      }
    };
  }
</script>

<DashboardContent title="Bursar & Finance" subtitle="School fee collections and bank payments">
  {#snippet headerActions()}
    <a href="/admin/parent-payments">
      <Button variant="secondary" size="sm">Payment Details</Button>
    </a>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <KpiCard label="School Fees Collected" value={`KES ${s.schoolCollected?.toLocaleString() ?? 0}`} sub="Bank (12mo)" />
    <KpiCard label="M-Pesa Collected" value={`KES ${s.mpesaCollected?.toLocaleString() ?? 0}`} sub="Remedial (12mo)" />
    <KpiCard label="Receipts (12mo)" value={s.totalTransactions ?? 0} sub="All channels" />
  </div>

  <!-- KCB/Buni bank payment entry -->
  <div class="mt-8 rounded-xl border border-border bg-card p-5 shadow-card">
    <h3 class="text-sm font-semibold text-foreground">Record KCB / Buni Bank Payment</h3>
    <p class="mt-1 text-xs text-muted-foreground">School fees paid via bank transfer. Remedial fees are paid separately by parents via M-Pesa paybill.</p>
    {#if bankMsg}
      <div class="mt-3 rounded-lg px-4 py-2 text-sm {bankMsg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-danger'}">{bankMsg.text}</div>
    {/if}
    <form method="POST" action="?/record-bank" use:enhance={handleBankSubmit} class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="space-y-1.5">
        <Label for="student_id">Student</Label>
        <Input id="student_id" name="student_id" bind:value={bankForm.student_id} required placeholder="student uuid" />
      </div>
      <div class="space-y-1.5">
        <Label for="fee_type_id">Fee Type</Label>
        <select id="fee_type_id" name="fee_type_id" bind:value={bankForm.fee_type_id} required class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">Select fee</option>
          {#each feeTypes as f}
            <option value={f.id}>{f.name} · KES {Number(f.amount).toLocaleString()}</option>
          {/each}
        </select>
      </div>
      <div class="space-y-1.5">
        <Label for="amount">Amount (KES)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" bind:value={bankForm.amount} required placeholder="0.00" />
      </div>
      <div class="space-y-1.5">
        <Label for="bank_reference">Bank Reference</Label>
        <Input id="bank_reference" name="bank_reference" bind:value={bankForm.bank_reference} required placeholder="KCB receipt / ref" />
      </div>
      <div class="space-y-1.5">
        <Label for="bank_name">Bank</Label>
        <Input id="bank_name" name="bank_name" bind:value={bankForm.bank_name} placeholder="KCB" />
      </div>
      <div class="flex items-end lg:col-span-4 lg:justify-end">
        <Button type="submit" disabled={bankSubmitting}>{bankSubmitting ? 'Recording…' : 'Record'}</Button>
      </div>
    </form>
  </div>

  <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/admin/parent-payments"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m13.5-1.5v.75a.75.75 0 0 1-.75.75h-.75" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-foreground">Parent Payments</h3>
        <p class="mt-1 text-xs text-muted-foreground">View all parent payments and M-Pesa transactions.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-rose-700 group-hover:text-rose-800">
        View Details
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/reports"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-foreground">Financial Reports</h3>
        <p class="mt-1 text-xs text-muted-foreground">Revenue CSV and financial summary exports.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-slate-700 group-hover:text-slate-800">
        View Reports
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
  </div>
</DashboardContent>
