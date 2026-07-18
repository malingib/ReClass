<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const students = $derived(data.students);
  const invoices = $derived(data.invoices);
</script>

<DashboardContent title="Welcome back" subtitle="Your child's remedial schedule and M-Pesa payments">
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h3 class="text-sm font-semibold text-ink-900">Linked children</h3>
      <DataTable data={students} columns={[
        { key: 'admission_no', label: 'Adm No', sortable: true },
        { key: 'first_name', label: 'Name', render: (s: any) => `${s.first_name} ${s.last_name}` },
        { key: 'grade', label: 'Cohort' },
      ]} emptyMessage="No children linked" />
    </div>
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h3 class="text-sm font-semibold text-ink-900">Pending M-Pesa payments</h3>
      <DataTable data={invoices} columns={[
        { key: 'amount_due', label: 'Balance', render: (i: any) => `KES ${Number(i.amount_due - i.amount_paid).toLocaleString()}` },
        { key: 'status', label: 'Status' },
        { key: 'due_date', label: 'Due', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—' },
      ]} emptyMessage="No outstanding invoices" />
    </div>
  </div>
</DashboardContent>
