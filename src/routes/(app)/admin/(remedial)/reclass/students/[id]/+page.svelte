<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import ReceiptModal from '$lib/components/ReceiptModal.svelte';

  const { data, form } = $props();
  const s = $derived(data.student);
  const domain = $derived(data.domain);

  const paidTotal = $derived((data.transactions ?? []).reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0));

  let selectedPayment = $state<any | null>(null);

  function openReceipt(t: any) {
    selectedPayment = t;
  }
</script>

<DashboardContent
  title={s ? `${s.first_name} ${s.last_name}` : 'Student'}
  subtitle={`${domain === 'school' ? 'School fee' : 'Remedial'} transactions · ${s?.admission_no ?? ''}${s?.grade ? ` · ${s.grade}` : ''}`}
>
  {#snippet headerActions()}
    <a href="/admin/reclass/students" class="text-sm font-medium text-brand-600 hover:text-brand-700">← Back to ledger</a>
  {/snippet}

  {#if form?.success}
    <div class="mb-4 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
      Receipt updated — change audit-logged.
    </div>
  {/if}
  {#if form?.error}
    <div class="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{form.error}</div>
  {/if}

  {#if !s}
    <div class="rounded-xl border border-border bg-white p-8 text-center shadow-card">
      <p class="text-sm text-ink-500">Student not found.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-border bg-white p-5 shadow-card">
        <p class="text-sm font-medium text-ink-400">Paid ({domain})</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-success">KES {paidTotal.toLocaleString()}</p>
        <p class="mt-1 text-xs text-ink-500">{data.transactions.length} receipt(s)</p>
      </div>
      <div class="rounded-xl border border-border bg-white p-5 shadow-card">
        <p class="text-sm font-medium text-ink-400">Admission number</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{s.admission_no}</p>
        <p class="mt-1 text-xs text-ink-500">Use this as the M-Pesa account reference when paying</p>
      </div>
    </div>

    <div class="mt-6">
      <DataTable
        data={data.transactions}
        columns={[
          { key: 'receipt_no', label: 'Receipt', render: (r: any) => r.receipt_no ?? '—' },
          { key: 'fee_type', label: 'Fee', sortable: true },
          { key: 'amount', label: 'Amount', render: (r: any) => `KES ${Number(r.amount ?? 0).toLocaleString()}`, sortable: true },
          { key: 'method', label: 'Method', render: (r: any) => r.method === 'bank' ? `Bank${r.bank_reference ? ` (${r.bank_reference})` : ''}` : `M-Pesa${r.mpesa_receipt ? ` (${r.mpesa_receipt})` : ''}` },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'created_at', label: 'Date', render: (r: any) => r.created_at ? new Date(r.created_at).toLocaleDateString() : '—', sortable: true },
        ]}
        rowExtra={rowActions}
        emptyMessage="No payments recorded yet for this student in this domain."
      />
    </div>
  {/if}

  {#snippet rowActions(t: any)}
    <button
      onclick={() => openReceipt(t)}
      class="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
      View / Edit
    </button>
  {/snippet}

  <ReceiptModal
    open={!!selectedPayment}
    onOpenChange={(o: boolean) => { if (!o) selectedPayment = null; }}
    payment={selectedPayment}
    students={data.students}
    feeTypes={data.feeTypes}
  />
</DashboardContent>
