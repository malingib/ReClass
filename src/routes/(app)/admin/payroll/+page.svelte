<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let payroll = $derived(data.payroll);
</script>

<DashboardContent title="Teacher payroll" subtitle="Remedial session stipends and paid teachers">
  <DataTable
    data={payroll}
    columns={[
      { key: 'teacher_id', label: 'Teacher' },
      { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}` },
      { key: 'month', label: 'Period', render: (p: any) => `${p.month}/${p.year}` },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'paid_at', label: 'Paid Date', render: (p: any) => p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—' },
    ]}
    emptyMessage="No payroll records found"
  />
</DashboardContent>
