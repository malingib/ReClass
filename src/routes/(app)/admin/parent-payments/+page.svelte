<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const invoices = $derived(data.invoices ?? []);
  const payments = $derived(data.payments ?? []);
  const stats = $derived(data.stats);

  let filter = $state<'all' | 'paid' | 'unpaid' | 'partial'>('all');

  const filteredInvoices = $derived(
    filter === 'all' ? invoices : invoices.filter((i: any) => i.status === filter)
  );
</script>

<DashboardContent title="Parent Payments" subtitle="Invoice and payment activity from parents">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-sm text-ink-500">Enrolled students</p>
      <p class="text-2xl font-semibold text-ink-900">{stats.totalStudents}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-sm text-ink-500">Paid via M-Pesa</p>
      <p class="text-2xl font-semibold text-success">{stats.paid}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-sm text-ink-500">Unpaid</p>
      <p class="text-2xl font-semibold text-danger">{stats.unpaid}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-sm text-ink-500">Partial</p>
      <p class="text-2xl font-semibold text-warning">{stats.partial}</p>
    </div>
  </div>

  <div class="flex gap-2">
    {#each ['all', 'paid', 'unpaid', 'partial'] as f}
      <button
        onclick={() => filter = f as any}
        class="rounded-md px-3 py-1.5 text-xs font-medium {filter === f ? 'bg-brand-600 text-white' : 'border border-border text-ink-500 hover:bg-ink-50'}"
      >
        {f.charAt(0).toUpperCase() + f.slice(1)}
      </button>
    {/each}
  </div>

  <DataTable
    data={filteredInvoices}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Adm No' },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'amount_due', label: 'Due', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}`, sortable: true },
      { key: 'amount_paid', label: 'Paid', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}`, sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'due_date', label: 'Due', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—' },
    ]}
    emptyMessage="No parent invoices"
  />

  <!-- Recent payments -->
  {#if payments.length > 0}
    <div>
      <h3 class="text-sm font-semibold text-ink-900">Recent M-Pesa Payments (12 months)</h3>
      <DataTable
        data={payments}
        columns={[
          { key: 'mpesa_receipt', label: 'Receipt', render: (p: any) => p.mpesa_receipt ?? '—' },
          { key: 'phone', label: 'Phone' },
          { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}`, sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'created_at', label: 'Date', render: (p: any) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '—', sortable: true },
        ]}
        emptyMessage="No payments in the last 12 months"
      />
    </div>
  {/if}
</DashboardContent>
