<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Download } from 'lucide-svelte';

  const { data } = $props();
  const totalRevenue = $derived(data.totalRevenue ?? 0);
  const payments = $derived(data.payments ?? []);
  const checkouts = $derived(data.checkouts ?? []);

  let searchQuery = $state('');
  let methodFilter = $state('all');

  const filtered = $derived.by(() => {
    let result = payments;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) =>
        (p.student_name?.toLowerCase() ?? '').includes(q) ||
        (p.admission_no?.toLowerCase() ?? '').includes(q) ||
        (p.grade?.toLowerCase() ?? '').includes(q) ||
        (p.fee_type?.toLowerCase() ?? '').includes(q)
      );
    }
    if (methodFilter !== 'all') {
      result = result.filter((p: any) => (p.domain === 'remedial' ? 'mpesa' : p.method) === methodFilter);
    }
    return result;
  });

  function methodLabel(p: any) {
    if (p.domain === 'remedial') return 'M-Pesa';
    return p.method === 'bank' ? `Bank${p.bank_name ? ` (${p.bank_name})` : ''}` : (p.method ?? '—');
  }

  function downloadCsv() {
    const headers = ['Student', 'Admission No', 'Grade', 'Fee', 'Amount (KES)', 'Method', 'Reference', 'Date'];
    const rows = filtered.map((p: any) => [
      p.student_name, p.admission_no, p.grade, p.fee_type,
      p.amount, methodLabel(p),
      p.method === 'bank' ? (p.bank_reference ?? '') : (p.mpesa_receipt ?? ''),
      p.created_at?.split('T')[0] ?? '—',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<DashboardContent title="Bursar workspace" subtitle="M-Pesa & bank payments, revenue, and printable receipts">
  {#snippet headerActions()}
    <Button variant="outline" size="sm" onclick={downloadCsv}>
      <Download class="h-3.5 w-3.5" /> Download CSV
    </Button>
    <Button href="/bursar/csv" variant="outline" size="sm">Export All</Button>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
    <KpiCard label="Receipts" value={payments.length} sub="Listed" />
    <KpiCard label="Revenue (12mo)" value={`KES ${totalRevenue.toLocaleString()}`} sub="All channels" />
    <KpiCard label="M-Pesa (remedial)" value={payments.filter((p:any)=>p.domain==='remedial').length} sub="Receipts" />
    <KpiCard label="Bank (school)" value={payments.filter((p:any)=>p.domain!=='remedial').length} sub="Receipts" />
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <Input type="text" placeholder="Search by student, admission no, grade, fee…" bind:value={searchQuery} class="min-w-[200px]" />
    <select bind:value={methodFilter}
      class="rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
      <option value="all">All channels</option>
      <option value="mpesa">M-Pesa</option>
      <option value="bank">Bank</option>
    </select>
    {#if filtered.length !== payments.length}
      <span class="text-xs text-slate-400">{filtered.length} of {payments.length} shown</span>
    {/if}
  </div>

  <DataTable data={filtered} columns={[
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'admission_no', label: 'Adm No', sortable: true },
    { key: 'grade', label: 'Grade', sortable: true },
    { key: 'fee_type', label: 'Fee', sortable: true },
    { key: 'amount', label: 'Amount (KES)', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}`, sortable: true },
    { key: 'method', label: 'Channel', render: (p: any) => methodLabel(p), sortable: true },
    { key: 'created_at', label: 'Date', render: (p: any) => p.created_at?.split('T')[0] ?? '—', sortable: true },
  ]} emptyMessage="No receipts found" rowExtra={receiptActions} />

  {#snippet receiptActions(p: any)}
    <a href={`/admin/receipts/${p.id}/print`} target="_blank" class="text-xs font-medium text-primary hover:underline">Print receipt</a>
  {/snippet}

  {#if checkouts.length > 0}
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Failed / Pending STK Pushes</h3>
      <p class="text-xs text-slate-500">Checkout requests that did not complete. These may need manual follow-up.</p>
      <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th class="px-4 py-3">Phone</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Reason</th>
              <th class="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {#each checkouts as c}
              <tr class="border-b border-slate-100 last:border-0">
                <td class="px-4 py-2.5 text-slate-900">{c.phone ?? '—'}</td>
                <td class="px-4 py-2.5 text-slate-900">KES {Number(c.amount).toLocaleString()}</td>
                <td class="px-4 py-2.5">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {c.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}">{c.status}</span>
                </td>
                <td class="px-4 py-2.5 text-slate-500">{c.reason ?? '—'}</td>
                <td class="px-4 py-2.5 text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</DashboardContent>
