<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  // Placeholder data — wire to server endpoint querying waivers table
  let waivers = [
    { id: '1', student: 'Alice M.', amount: 2500, reason: 'Financial hardship', status: 'Approved', date: '2026-07-10' },
    { id: '2', student: 'Bob K.', amount: 1500, reason: 'Sibling discount', status: 'Pending', date: '2026-07-12' },
  ];
</script>

<DashboardContent title="Fee waivers" subtitle="Approve waivers alongside M-Pesa reconciliation">
  <DataTable
    data={waivers}
    columns={[
      { key: 'student', label: 'Student', sortable: true },
      { key: 'amount', label: 'Amount (KES)', render: (w: any) => `KES ${Number(w.amount).toLocaleString()}`, sortable: true },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'date', label: 'Date', sortable: true },
    ]}
    emptyMessage="No waivers issued yet"
  />
</DashboardContent>
