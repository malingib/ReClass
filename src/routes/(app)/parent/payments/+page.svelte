<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const payments = $derived(data.payments);
  const recentInvoices = $derived(data.recentInvoices);
</script>

<DashboardContent title="Payment History" subtitle="Transaction receipts and outstanding balances">
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h3 class="mb-3 text-sm font-semibold text-ink-900">M-Pesa Transactions</h3>
      <DataTable
        data={payments}
        columns={[
          { key: 'created_at', label: 'Date', render: (p: any) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '—' },
          { key: 'student_name', label: 'Student' },
          { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}` },
          { key: 'mpesa_receipt', label: 'Receipt', render: (p: any) => p.mpesa_receipt ?? '—' },
          { key: 'status', label: 'Status', sortable: true },
        ]}
        emptyMessage="No transactions yet"
      />
    </div>

    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h3 class="mb-3 text-sm font-semibold text-ink-900">Invoice History</h3>
      <DataTable
        data={recentInvoices}
        columns={[
          { key: 'created_at', label: 'Date', render: (i: any) => i.created_at ? new Date(i.created_at).toLocaleDateString() : '—' },
          { key: 'student_name', label: 'Student', render: (i: any) => i.students ? `${i.students.first_name} ${i.students.last_name}` : '—' },
          { key: 'amount_due', label: 'Amount', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}` },
          { key: 'amount_paid', label: 'Paid', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}` },
          { key: 'status', label: 'Status', sortable: true },
        ]}
        emptyMessage="No invoices yet"
      />
    </div>
  </div>
</DashboardContent>
