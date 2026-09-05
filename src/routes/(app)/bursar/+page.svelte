<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { ArrowRight, CheckCircle2, Download, ReceiptText, Search, WalletCards } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  const { data } = $props();
  const totalRevenue = $derived(data.totalRevenue ?? 0);
  const payments = $derived(data.payments ?? []);
  const pagination = $derived(data.pagination);
  const recentPayments = $derived(payments.slice(0, 6));

  function setSearch(value: string) {
    const url = new URL(page.url);
    if (value.trim()) url.searchParams.set('search', value.trim()); else url.searchParams.delete('search');
    url.searchParams.delete('page');
    goto(`${url.pathname}?${url.searchParams.toString()}`, { keepFocus: true, noScroll: true });
  }

  function downloadCsv() {
    const headers = ['Student', 'Admission No', 'Grade', 'Fee', 'Amount (KES)', 'Channel', 'Reference', 'Date'];
    const rows = payments.map((p: any) => [p.student_name, p.admission_no, p.grade, p.fee_type, p.amount, p.method === 'bank' ? 'Bank' : (p.method ?? '—'), p.bank_reference ?? p.mpesa_receipt ?? '', p.created_at?.split('T')[0] ?? '—']);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = objectUrl; a.download = `school-receipts-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(objectUrl);
  }
</script>

<svelte:head><title>Finance today · eShule</title><meta name="description" content="School finance workspace for the Bursar: collections, payment evidence and reconciliation." /></svelte:head>

<DashboardContent title="Finance today" subtitle="Keep school collections, reconciliation and payment evidence under the Bursar's control.">
  {#snippet headerActions()}
    <Button variant="outline" size="sm" onclick={downloadCsv}><Download class="h-3.5 w-3.5" /> Export visible</Button>
    <Button href="/bursar/csv" variant="outline" size="sm">Export all</Button>
  {/snippet}

  <div class="space-y-7">
    <section class="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-white p-6 shadow-card sm:p-8">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">School finance · Bursar owned</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">Know what came in. Clear what needs action.</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-ink-500">The Bursar owns the school-finance ledger. Receipts document actual payments; ReClass remedial money remains in its own domain.</p>
        </div>
        <a href="/admin/payments/unmatched" class="ui-action ui-action-primary min-h-11 shrink-0">Review unmatched <ArrowRight class="h-4 w-4" /></a>
      </div>
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">School receipts</p><p class="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{pagination.total}</p><p class="mt-1 text-[11px] text-ink-400">Paid transactions</p></div>
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">Revenue · 12 months</p><p class="mt-1 text-2xl font-bold text-ink-900 tabular-nums">KES {totalRevenue.toLocaleString()}</p><p class="mt-1 text-[11px] text-ink-400">School domain</p></div>
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">Visible payments</p><p class="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{recentPayments.length}</p><p class="mt-1 text-[11px] text-ink-400">Current result set</p></div>
      </div>
    </section>

    <section aria-labelledby="workflow-title">
      <div class="mb-4"><h2 id="workflow-title" class="text-lg font-semibold text-ink-900">Today's finance workflow</h2><p class="mt-1 text-sm text-ink-400">Resolve exceptions first, then preserve the payment evidence that makes the ledger trustworthy.</p></div>
      <div class="grid gap-3 lg:grid-cols-3">
        <a href="/admin/payments/unmatched" class="group rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov">
          <span class="ui-status ui-status-warning">1 · Needs action</span><h3 class="mt-3 text-sm font-semibold text-ink-900">Reconcile unmatched payments</h3><p class="mt-1 text-xs leading-5 text-ink-500">Match incoming money to the correct learner before treating it as settled school finance.</p><span class="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">Open reconciliation <ArrowRight class="h-3.5 w-3.5" /></span>
        </a>
        <a href="/admin/finance/receipts" class="group rounded-2xl border border-border/60 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov">
          <span class="ui-status ui-status-success">2 · Evidence</span><h3 class="mt-3 text-sm font-semibold text-ink-900">Verify receipts</h3><p class="mt-1 text-xs leading-5 text-ink-500">Inspect actual payment evidence and print receipts after reconciliation.</p><span class="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">Open receipts <ArrowRight class="h-3.5 w-3.5" /></span>
        </a>
        <a href="/admin/finance/income" class="group rounded-2xl border border-border/60 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov">
          <span class="ui-status ui-status-neutral">3 · Record</span><h3 class="mt-3 text-sm font-semibold text-ink-900">Record other income</h3><p class="mt-1 text-xs leading-5 text-ink-500">Capture non-payment income with supporting evidence in the school-finance ledger.</p><span class="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">Record income <ArrowRight class="h-3.5 w-3.5" /></span>
        </a>
      </div>
    </section>

    <section aria-labelledby="actions-title">
      <div class="mb-4"><h2 id="actions-title" class="text-lg font-semibold text-ink-900">Finance actions</h2><p class="mt-1 text-sm text-ink-400">Supporting tools for the Bursar's daily control loop.</p></div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <a href="/admin/payments/unmatched" class="ui-card group"><WalletCards class="h-5 w-5 text-primary" /><h3 class="mt-3 text-sm font-semibold text-ink-900">Reconcile payments</h3><p class="mt-1 text-xs leading-5 text-ink-500">Resolve payments that need student or receipt matching.</p></a>
        <a href="/admin/finance/income" class="ui-card group"><WalletCards class="h-5 w-5 text-primary" /><h3 class="mt-3 text-sm font-semibold text-ink-900">Record income</h3><p class="mt-1 text-xs leading-5 text-ink-500">Capture a school income item with its supporting evidence.</p></a>
        <a href="/admin/finance/receipts" class="ui-card group"><ReceiptText class="h-5 w-5 text-primary" /><h3 class="mt-3 text-sm font-semibold text-ink-900">Receipts</h3><p class="mt-1 text-xs leading-5 text-ink-500">Find, inspect and print actual payment receipts.</p></a>
        <a href="/admin/finance" class="ui-card group"><Search class="h-5 w-5 text-primary" /><h3 class="mt-3 text-sm font-semibold text-ink-900">Finance overview</h3><p class="mt-1 text-xs leading-5 text-ink-500">Review the wider school-finance workspace and reports.</p></a>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
      <div class="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><div class="flex items-center gap-2"><CheckCircle2 class="h-4 w-4 text-emerald-600" /><h2 class="text-lg font-semibold text-ink-900">Payment evidence</h2></div><p class="mt-1 text-sm text-ink-400">Search actual school payments, then inspect or print the receipt.</p></div>
        <div class="relative w-full sm:w-72"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" /><input value={pagination.search} oninput={(e) => setSearch(e.currentTarget.value)} placeholder="Receipt, phone or reference" aria-label="Search school payments" class="ui-control w-full pl-9 pr-3" /></div>
      </div>
      <DataTable data={payments} columns={[{ key: 'student_name', label: 'Student', sortable: true }, { key: 'admission_no', label: 'Adm No', sortable: true }, { key: 'grade', label: 'Grade', sortable: true }, { key: 'fee_type', label: 'Fee', sortable: true }, { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}`, sortable: true }, { key: 'method', label: 'Channel', render: (p: any) => p.method === 'bank' ? 'Bank' : (p.method ?? '—') }, { key: 'created_at', label: 'Date', render: (p: any) => p.created_at?.split('T')[0] ?? '—', sortable: true }]} emptyMessage="No school payments found. Try a different receipt, phone number or reference." rowExtra={receiptActions} server={{ total: pagination.total, page: pagination.page, pageSize: pagination.pageSize, search: pagination.search, sortKey: pagination.sortKey, sortDir: pagination.sortDir }} />
      {#snippet receiptActions(p: any)}<a href={`/admin/receipts/${p.id}/print`} target="_blank" rel="noreferrer" class="ui-action ui-action-secondary min-h-11 text-xs">Print receipt</a>{/snippet}
    </section>
  </div>
</DashboardContent>
