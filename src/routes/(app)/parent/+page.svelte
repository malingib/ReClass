<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const students = $derived(data.students);
  const payments = $derived(data.payments);
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
      <h3 class="text-sm font-semibold text-ink-900">Recent payments</h3>
      <DataTable data={payments} columns={[
        { key: 'created_at', label: 'Date', render: (p: any) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '—' },
        { key: 'fee_type', label: 'Fee' },
        { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}` },
        { key: 'channel', label: 'Channel', render: (p: any) => p.domain === 'remedial' ? 'M-Pesa' : (p.method ?? 'Bank') },
      ]} emptyMessage="No payments yet" />
    </div>
  </div>
</DashboardContent>
