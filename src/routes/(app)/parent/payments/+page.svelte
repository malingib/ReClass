<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const payments = $derived(data.payments);
</script>

<DashboardContent title="Payment History" subtitle="Your child's payment receipts">
  <div class="rounded-xl border border-border bg-white p-6 shadow-card">
    <h3 class="mb-3 text-sm font-semibold text-ink-900">Receipts</h3>
    <DataTable
      data={payments}
      columns={[
        { key: 'created_at', label: 'Date', render: (p: any) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '—' },
        { key: 'student_name', label: 'Student' },
        { key: 'fee_type', label: 'Fee' },
        { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}` },
        { key: 'channel', label: 'Channel', render: (p: any) => p.domain === 'remedial' ? 'M-Pesa' : (p.method ?? 'Bank') },
        { key: 'receipt', label: 'Receipt', render: (p: any) => `<a class="text-brand-600 hover:underline" href="/admin/receipts/${p.id}/print" target="_blank">Print</a>`, html: true },
        { key: 'status', label: 'Status', sortable: true },
      ]}
      emptyMessage="No transactions yet"
    />
  </div>
</DashboardContent>
