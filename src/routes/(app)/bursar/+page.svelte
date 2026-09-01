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
  const pagination = $derived(data.pagination);

  function setSearch(value: string) {
    const url = new URL(page.url);
    if (value.trim()) url.searchParams.set('search', value.trim());
    else url.searchParams.delete('search');
    url.searchParams.delete('page');
    goto(`${url.pathname}?${url.searchParams.toString()}`, { keepFocus: true, noScroll: true });
  }

  function downloadCsv() {
    const headers = ['Student', 'Admission No', 'Grade', 'Fee', 'Amount (KES)', 'Channel', 'Reference', 'Date'];
    const rows = payments.map((p: any) => [
      p.student_name, p.admission_no, p.grade, p.fee_type, p.amount,
      p.method === 'bank' ? 'Bank' : (p.method ?? '—'),
      p.bank_reference ?? p.mpesa_receipt ?? '', p.created_at?.split('T')[0] ?? '—',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `school-receipts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }
</script>

<DashboardContent title="Bursar & School Finance" subtitle="Own school fee collection, reconciliation and payment evidence">
  {#snippet headerActions()}
    <Button variant="outline" size="sm" onclick={downloadCsv}>
      <Download class="h-3.5 w-3.5" /> Download visible receipts
    </Button>
    <Button href="/bursar/csv" variant="outline" size="sm">Export all</Button>
  {/snippet}

  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-semibold text-slate-900">School finance workspace</p>
        <p class="mt-1 text-xs text-slate-500">The Bursar owns the school-finance ledger. ReClass remedial operations and remedial M-Pesa are intentionally kept outside this workspace.</p>
      </div>
      <span class="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">School domain</span>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <KpiCard label="School receipts" value={pagination.total} sub="Actual paid transactions" />
    <KpiCard label="Revenue (12mo)" value={`KES ${totalRevenue.toLocaleString()}`} sub="School domain" />
  </div>

  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-sm font-semibold text-slate-900">Payment evidence</h2>
      <p class="text-xs text-slate-500">Receipts document actual payments; they do not create or alter fee definitions.</p>
    </div>
    <input
      value={pagination.search}
      oninput={(e) => setSearch(e.currentTarget.value)}
      placeholder="Search receipt, phone or reference"
      aria-label="Search school payments"
      class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm sm:w-72"
    />
  </div>

  <DataTable
    data={payments}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Adm No', sortable: true },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'fee_type', label: 'Fee', sortable: true },
      { key: 'amount', label: 'Amount (KES)', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}`, sortable: true },
      { key: 'method', label: 'Channel', render: (p: any) => p.method === 'bank' ? 'Bank' : (p.method ?? '—') },
      { key: 'created_at', label: 'Date', render: (p: any) => p.created_at?.split('T')[0] ?? '—', sortable: true },
    ]}
    emptyMessage="No school receipts found"
    rowExtra={receiptActions}
    server={{ total: pagination.total, page: pagination.page, pageSize: pagination.pageSize, search: pagination.search, sortKey: pagination.sortKey, sortDir: pagination.sortDir }}
  />

  {#snippet receiptActions(p: any)}
    <a href={`/admin/receipts/${p.id}/print`} target="_blank" rel="noreferrer" class="text-xs font-medium text-primary hover:underline">Print receipt</a>
  {/snippet}
</DashboardContent>