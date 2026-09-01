<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Download } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  const { data } = $props();
  const totalRevenue = $derived(data.totalRevenue ?? 0);
  const payments = $derived(data.payments ?? []);
  const checkouts = $derived(data.checkouts ?? []);
  const pagination = $derived(data.pagination);
  const stats = $derived(data.stats ?? { mpesa: 0, bank: 0, total: 0 });
  const attentionCount = $derived(checkouts.length);

  function methodLabel(p: any) { return p.domain === 'remedial' ? 'M-Pesa' : p.method === 'bank' ? `Bank${p.bank_name ? ` (${p.bank_name})` : ''}` : (p.method ?? '—'); }
  function setChannel(c: string) { const url = new URL(page.url); if (c === 'all') url.searchParams.delete('channel'); else url.searchParams.set('channel', c); url.searchParams.delete('page'); goto(`${url.pathname}?${url.searchParams.toString()}`, { keepFocus: true, noScroll: true }); }
  function downloadCsv() { const headers = ['Student','Admission No','Grade','Fee','Amount (KES)','Method','Reference','Date']; const rows = payments.map((p:any) => [p.student_name,p.admission_no,p.grade,p.fee_type,p.amount,methodLabel(p),p.method === 'bank' ? (p.bank_reference ?? '') : (p.mpesa_receipt ?? ''),p.created_at?.split('T')[0] ?? '—']); const csv=[headers.join(','),...rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n'); const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); const a=document.createElement('a'); a.href=url; a.download=`receipts-export-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url); }
</script>

<DashboardContent title="Finance Operations Center" subtitle="Collections, reconciliation, receipts and payment exceptions">
  {#snippet headerActions()}
    <Button variant="outline" size="sm" onclick={downloadCsv} aria-label="Download current payment results as CSV"><Download class="h-3.5 w-3.5" /> Download CSV</Button>
    <Button href="/bursar/csv" variant="outline" size="sm">Export all</Button>
  {/snippet}

  <div class="space-y-6">
    <section aria-labelledby="finance-focus" class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Today’s finance work</p><h2 id="finance-focus" class="mt-1 text-xl font-bold text-slate-950">Keep collections moving and exceptions visible.</h2><p class="mt-1 text-sm text-slate-500">Start with failed or pending payments, then reconcile receipts.</p></div><a href="#exceptions" class="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30">Review exceptions <span aria-hidden="true" class="ml-1">→</span></a></div>
    </section>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Receipts" value={pagination.total} sub="Current filter" />
      <KpiCard label="Revenue · 12mo" value={`KES ${totalRevenue.toLocaleString()}`} sub="All channels" />
      <KpiCard label="M-Pesa receipts" value={stats.mpesa} sub="Remedial channel" />
      <KpiCard label="Bank receipts" value={stats.bank} sub="School channel" />
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <section aria-labelledby="receipts-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 id="receipts-heading" class="text-base font-bold text-slate-900">Recent receipts</h2><p class="mt-1 text-sm text-slate-500">Search, filter and print confirmed payments.</p></div><span class="text-xs text-slate-400">Page {pagination.page} · {pagination.total} total</span></div></div><div class="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3" role="group" aria-label="Payment channel filters">{#each [['all','All channels'],['mpesa','M-Pesa'],['bank','Bank']] as [v,l]}<button type="button" onclick={() => setChannel(v)} aria-pressed={pagination.channel === v} class="min-h-9 rounded-md px-3 text-xs font-semibold {pagination.channel === v ? 'bg-primary text-primary-foreground' : 'border border-input bg-white text-muted-foreground hover:bg-muted'}">{l}</button>{/each}</div><DataTable data={payments} columns={[{key:'student_name',label:'Student',sortable:true},{key:'admission_no',label:'Adm No',sortable:true},{key:'grade',label:'Grade',sortable:true},{key:'fee_type',label:'Fee',sortable:true},{key:'amount',label:'Amount (KES)',render:(p:any)=>`KES ${Number(p.amount).toLocaleString()}`,sortable:true},{key:'method',label:'Channel',render:(p:any)=>methodLabel(p),sortable:true},{key:'created_at',label:'Date',render:(p:any)=>p.created_at?.split('T')[0] ?? '—',sortable:true}]} emptyMessage="No receipts found" rowExtra={receiptActions} server={{total:pagination.total,page:pagination.page,pageSize:pagination.pageSize,search:pagination.search,sortKey:pagination.sortKey,sortDir:pagination.sortDir}} /></section>

      <aside aria-labelledby="finance-actions" class="rounded-xl border border-slate-200/70 bg-slate-950 p-5 text-white shadow-sm"><h2 id="finance-actions" class="text-base font-bold">Finance actions</h2><p class="mt-1 text-sm text-slate-300">Common work, one click away.</p><div class="mt-4 grid gap-2"><a href="/admin/receipts" class="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40">Manage receipts <span aria-hidden="true">→</span></a><a href="/admin/payments/unmatched" class="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40">Reconcile unmatched <span aria-hidden="true">→</span></a><a href="/admin/fees" class="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40">Review fee setup <span aria-hidden="true">→</span></a></div></aside>
    </div>

    <section id="exceptions" aria-labelledby="exceptions-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><div class="flex items-center justify-between gap-3"><div><h2 id="exceptions-heading" class="text-base font-bold text-slate-900">Payment exceptions</h2><p class="mt-1 text-sm text-slate-500">Pending or failed STK requests may need follow-up.</p></div>{#if attentionCount}<span class="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">{attentionCount} need attention</span>{/if}</div></div>{#if checkouts.length === 0}<div class="px-5 py-12 text-center"><div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600" aria-hidden="true">✓</div><p class="mt-3 text-sm font-semibold text-slate-700">No payment exceptions</p><p class="mt-1 text-xs text-slate-500">Pending and failed payment requests will appear here.</p></div>{:else}<div class="overflow-x-auto"><table class="w-full text-sm"><caption class="sr-only">Pending and failed payment requests</caption><thead><tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500"><th scope="col" class="px-4 py-3">Phone</th><th scope="col" class="px-4 py-3">Amount</th><th scope="col" class="px-4 py-3">Status</th><th scope="col" class="px-4 py-3">Reason</th><th scope="col" class="px-4 py-3">Date</th></tr></thead><tbody>{#each checkouts as c}<tr class="border-b border-slate-100 last:border-0"><td class="px-4 py-2.5">{c.phone ?? '—'}</td><td class="px-4 py-2.5">KES {Number(c.amount).toLocaleString()}</td><td class="px-4 py-2.5"><span class="rounded-full px-2 py-0.5 text-xs font-semibold {c.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}">{c.status}</span></td><td class="px-4 py-2.5 text-slate-500">{c.reason ?? '—'}</td><td class="px-4 py-2.5 text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td></tr>{/each}</tbody></table></div>{/if}</section>
  </div>

  {#snippet receiptActions(p: any)}<a href={`/admin/receipts/${p.id}/print`} target="_blank" rel="noreferrer" class="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30">Print receipt<span class="sr-only"> for {p.student_name}</span></a>{/snippet}
</DashboardContent>
