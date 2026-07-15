<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let invoices = $derived(data?.invoices ?? []);
</script>

<DashboardContent title="Remedial invoices" subtitle="Invoices billed to parents for their children's remedial classes">
  <DataTable
    data={invoices}
    columns={[
      { key: 'students', label: 'Student', render: (i: any) => i.students ? `${i.students.first_name} ${i.students.last_name}` : '—' },
      { key: 'amount_due', label: 'Due', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}` },
      { key: 'amount_paid', label: 'Paid (M-Pesa)', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}` },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'due_date', label: 'Due', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—' },
    ]}
    emptyMessage="No remedial invoices issued yet"
  />
</DashboardContent>
