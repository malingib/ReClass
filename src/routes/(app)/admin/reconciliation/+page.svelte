<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const allInvoices = $derived(data.allInvoices);
  const stats = $derived(data.stats);

  let filter = $state<'all' | 'paid' | 'unpaid' | 'partial'>('all');

  const filteredInvoices = $derived(
    filter === 'all' ? allInvoices : allInvoices.filter((i: any) => i.status === filter)
  );
</script>

<DashboardContent title="M-Pesa reconciliation" subtitle="Matching paybill callbacks to invoices and waivers">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-sm text-ink-500">Enrolled students</p>
      <p class="text-2xl font-semibold text-ink-900">{stats.totalStudents}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-sm text-ink-500">Paid via M-Pesa</p>
      <p class="text-2xl font-semibold text-success">{stats.paid}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-sm text-ink-500">Unpaid</p>
      <p class="text-2xl font-semibold text-danger">{stats.unpaid}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-sm text-ink-500">Partially paid</p>
      <p class="text-2xl font-semibold text-warning">{stats.partial}</p>
    </div>
  </div>

  <div class="flex gap-2">
    {#each ['all', 'paid', 'unpaid', 'partial'] as f}
      <button
        onclick={() => filter = f as any}
        class="rounded-md px-3 py-1.5 text-xs font-medium {filter === f ? 'bg-brand-600 text-white' : 'border border-border text-ink-500 hover:bg-ink-50'}"
      >
        {f.charAt(0).toUpperCase() + f.slice(1)}
      </button>
    {/each}
  </div>

  <DataTable
    data={filteredInvoices}
    columns={[
      { key: 'students', label: 'Student', render: (i: any) => i.students ? `${i.students.first_name} ${i.students.last_name} · Adm ${i.students.admission_no ?? '—'}` : '—' },
      { key: 'amount_due', label: 'Due', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}` },
      { key: 'amount_paid', label: 'Paid', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}` },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'due_date', label: 'Due', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—' },
    ]}
    emptyMessage="No matching invoices"
  />
</DashboardContent>
