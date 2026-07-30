<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import Button from '$lib/components/ui/button.svelte';

  const { data } = $props();
  const s = $derived(data.stats);
</script>

<DashboardContent title="Payroll" subtitle="Teacher invoice tracking and payment reconciliation">
  {#snippet headerActions()}
    <a href="/admin/teacher-invoices">
      <Button variant="primary" size="sm">Manage Invoices</Button>
    </a>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Total Invoices" value={s.totalInvoices} sub="All time" />
    <KpiCard label="Paid" value={s.paidInvoices} sub={`${s.unpaidInvoices} unpaid, ${s.draftInvoices} draft`} />
    <KpiCard label="Total Amount Due" value={`KES ${s.totalAmountDue.toLocaleString()}`} sub="Across all invoices" />
    <KpiCard label="Total Paid" value={`KES ${s.totalPaid.toLocaleString()}`} sub="Total payments collected" />
  </div>

  <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/admin/teacher-invoices"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Invoice Management</h3>
        <p class="mt-1 text-xs text-ink-500">Create, edit, generate from payroll, and mark invoices as paid.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-indigo-700 group-hover:text-indigo-800">
        Open Invoices
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/reports/revenue-csv" download
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Payroll Export</h3>
        <p class="mt-1 text-xs text-ink-500">Download payroll summary as CSV.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-amber-700 group-hover:text-amber-800">
        Download CSV
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/parent-payments"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m13.5-1.5v.75a.75.75 0 0 1-.75.75h-.75" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Parent Payments</h3>
        <p class="mt-1 text-xs text-ink-500">View parent invoice payments and M-Pesa transaction history.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
        View Payments
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
  </div>
</DashboardContent>
