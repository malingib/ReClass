<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const fees = $derived(data.fees);
  const ledger = $derived(data.ledger ?? []);
  const totalBalance = $derived(ledger.reduce((sum, row: any) => sum + Number(row.balance ?? 0), 0));
</script>

<DashboardContent title="Fees" subtitle="What your children owe and how to pay">
  {#if ledger.length > 0}
    <div class="mb-6 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Outstanding balance</h3>
          <p class="text-xs text-slate-500">School + remedial fees across all enrolled children</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-medium text-slate-500">Total outstanding</p>
          <p class="text-xl font-semibold {totalBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}">KES {totalBalance.toLocaleString()}</p>
        </div>
      </div>
      <div class="p-0">
        <DataTable data={ledger} columns={[
          { key: 'first_name', label: 'Child', render: (s: any) => `${s.first_name} ${s.last_name} (${s.admission_no ?? ''})` },
          { key: 'grade', label: 'Cohort' },
          { key: 'obligation', label: 'Total fees', render: (s: any) => `KES ${Number(s.obligation).toLocaleString()}` },
          { key: 'paid', label: 'Paid', render: (s: any) => `KES ${Number(s.paid).toLocaleString()}` },
          { key: 'balance', label: 'Balance', render: (s: any) => `KES ${Number(s.balance).toLocaleString()}` },
        ]} emptyMessage="No balances" />
      </div>
    </div>
  {/if}

  <div class="mb-4">
    <h3 class="text-sm font-semibold text-slate-900">School fee structure</h3>
    <p class="text-xs text-slate-500">School fees are paid by bank transfer; remedial fees are paid via M-Pesa. Use the Pay page to make a payment.</p>
  </div>
  <DataTable data={fees} columns={[
    { key: 'name', label: 'Fee', sortable: true },
    { key: 'amount', label: 'Amount', render: (f: any) => `KES ${Number(f.amount).toLocaleString()}` },
    { key: 'due_date', label: 'Due', render: (f: any) => f.due_date ? new Date(f.due_date).toLocaleDateString() : '—' },
    { key: 'term', label: 'Term' },
  ]} emptyMessage="No fee records" />

  <div class="mt-6">
    <a href="/parent/pay" class="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
      Make a payment
    </a>
  </div>
</DashboardContent>