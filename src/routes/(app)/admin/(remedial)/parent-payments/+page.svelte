<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const payments = $derived(data.payments ?? []);
  const stats = $derived(data.stats);

  function channelLabel(p: { domain: string; method?: string; bank_name?: string }) {
    if (p.domain === 'remedial') return 'M-Pesa';
    return p.method === 'bank' ? `Bank${p.bank_name ? ` (${p.bank_name})` : ''}` : (p.method ?? '—');
  }

  let filter = $state<'all' | 'mpesa' | 'bank'>('all');
  const filtered = $derived(
    filter === 'all' ? payments : payments.filter((p: any) => (p.domain === 'remedial' ? 'mpesa' : 'bank') === filter)
  );
</script>

<DashboardContent title="Parent Payments" subtitle="Receipts from parents — M-Pesa (remedial) and bank (school fees)">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
    <div class="rounded-xl border border-border bg-card p-4 shadow-card">
      <p class="text-sm text-muted-foreground">Enrolled students</p>
      <p class="text-2xl font-semibold text-foreground">{stats.totalStudents}</p>
    </div>
    <div class="rounded-xl border border-border bg-card p-4 shadow-card">
      <p class="text-sm text-muted-foreground">M-Pesa receipts</p>
      <p class="text-2xl font-semibold text-success">{stats.paid}</p>
    </div>
    <div class="rounded-xl border border-border bg-card p-4 shadow-card">
      <p class="text-sm text-muted-foreground">Bank receipts</p>
      <p class="text-2xl font-semibold text-foreground">{stats.unpaid}</p>
    </div>
    <div class="rounded-xl border border-border bg-card p-4 shadow-card">
      <p class="text-sm text-muted-foreground">Total receipts</p>
      <p class="text-2xl font-semibold text-warning">{stats.totalReceipts}</p>
    </div>
  </div>

  <div class="flex gap-2">
    {#each [['all', 'All'], ['mpesa', 'M-Pesa'], ['bank', 'Bank']] as [f, label]}
      <button
        onclick={() => filter = f as any}
        class="rounded-md px-3 py-1.5 text-xs font-medium {filter === f ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'}"
      >
        {label}
      </button>
    {/each}
  </div>

  <DataTable
    data={filtered}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Adm No' },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'fee_type', label: 'Fee' },
      { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}`, sortable: true },
      { key: 'channel', label: 'Channel', render: (p: any) => channelLabel(p) },
      { key: 'receipt', label: 'Receipt', render: (p: any) => `<a class="text-primary hover:underline" href="/admin/receipts/${p.id}/print" target="_blank">Print</a>`, html: true },
      { key: 'created_at', label: 'Date', render: (p: any) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '—', sortable: true },
    ]}
    emptyMessage="No parent payments"
  />
</DashboardContent>
