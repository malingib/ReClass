<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const waivers = $derived(data.waivers ?? []);
  const invoices = $derived(data.invoices ?? []);
</script>

<DashboardContent title="Fee waivers" subtitle="Approve waivers alongside M-Pesa reconciliation">
  <!-- Waivers table -->
  <h3 class="mb-3 text-sm font-semibold text-ink-900">Issued Waivers</h3>
  <DataTable
    data={waivers}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Admission No' },
      { key: 'amount', label: 'Amount (KES)', render: (w: any) => `KES ${Number(w.amount).toLocaleString()}`, sortable: true },
      { key: 'reason', label: 'Reason' },
      { key: 'created_at', label: 'Date', render: (w: any) => w.created_at?.split('T')[0] ?? '—', sortable: true },
    ]}
    emptyMessage="No waivers issued yet"
  />

  <!-- Outstanding invoices eligible for waiver -->
  <h3 class="mb-3 mt-8 text-sm font-semibold text-ink-900">Outstanding Invoices</h3>
  <DataTable
    data={invoices}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Admission No' },
      { key: 'amount_due', label: 'Amount Due', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}`, sortable: true },
      { key: 'amount_paid', label: 'Amount Paid', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}`, sortable: true },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No outstanding invoices"
  />
</DashboardContent>
