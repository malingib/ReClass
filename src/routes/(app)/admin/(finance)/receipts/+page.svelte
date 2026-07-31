<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const payments = $derived(data.payments ?? []);

  function channelLabel(p: any) {
    if (p.domain === 'remedial') return 'M-Pesa';
    return p.method === 'bank' ? `Bank${p.bank_name ? ` (${p.bank_name})` : ''}` : (p.method ?? '—');
  }

  let filter = $state<'all' | 'mpesa' | 'bank'>('all');
  const filtered = $derived(
    filter === 'all' ? payments : payments.filter((p: any) => (p.domain === 'remedial' ? 'mpesa' : 'bank') === filter)
  );
</script>

<DashboardContent title="Receipts" subtitle="All payment receipts — school (bank) and remedial (M-Pesa)">
  <div class="flex gap-2">
    {#each [['all', 'All'], ['mpesa', 'M-Pesa'], ['bank', 'Bank']] as [f, label]}
      <button
        onclick={() => filter = f as any}
        class="rounded-md px-3 py-1.5 text-xs font-medium {filter === f ? 'bg-brand-600 text-white' : 'border border-border text-ink-500 hover:bg-ink-50'}"
      >
        {label}
      </button>
    {/each}
  </div>

  <div class="mt-4">
    <DataTable
      data={filtered}
      columns={[
        { key: 'student_name', label: 'Student', sortable: true },
        { key: 'admission_no', label: 'Adm No' },
        { key: 'grade', label: 'Grade', sortable: true },
        { key: 'fee_type', label: 'Fee' },
        { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}`, sortable: true },
        { key: 'channel', label: 'Channel', render: (p: any) => channelLabel(p) },
        { key: 'receipt', label: 'Receipt', render: (p: any) => `<a class="text-brand-600 hover:underline" href="/admin/receipts/${p.id}/print" target="_blank">Print</a>` },
        { key: 'created_at', label: 'Date', render: (p: any) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '—', sortable: true },
      ]}
      emptyMessage="No receipts yet"
    />
  </div>
</DashboardContent>
