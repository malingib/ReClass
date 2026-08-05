<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();

  let domain = $state<'school' | 'remedial'>('remedial');
  const rows = $derived(domain === 'school' ? data.school : data.remedial);

  const totalObligation = $derived(rows.reduce((s: number, r: any) => s + Number(r.obligation ?? 0), 0));
  const totalPaid = $derived(rows.reduce((s: number, r: any) => s + Number(r.paid ?? 0), 0));
  const totalBalance = $derived(rows.reduce((s: number, r: any) => s + Number(r.balance ?? 0), 0));
</script>

<DashboardContent title="Student Ledger" subtitle="Every student's payments and balance — school fees and remedials">
  {#snippet headerActions()}
    <div class="flex gap-1 rounded-xl border border-border bg-ink-50/70 p-1">
      <button onclick={() => domain = 'remedial'}
        class="rounded-lg px-4 py-1.5 text-xs font-medium {domain === 'remedial' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}">
        Remedial
      </button>
      <button onclick={() => domain = 'school'}
        class="rounded-lg px-4 py-1.5 text-xs font-medium {domain === 'school' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}">
        School Fees
      </button>
    </div>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div class="rounded-xl border border-border bg-white p-5 shadow-card">
      <p class="text-sm font-medium text-ink-400">Obligation</p>
      <p class="mt-2 text-2xl font-semibold tracking-tight text-ink-900">KES {totalObligation.toLocaleString()}</p>
      <p class="mt-1 text-xs text-ink-500">{rows.length} active students</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-5 shadow-card">
      <p class="text-sm font-medium text-ink-400">Paid</p>
      <p class="mt-2 text-2xl font-semibold tracking-tight text-success">KES {totalPaid.toLocaleString()}</p>
      <p class="mt-1 text-xs text-ink-500">Receipts in this domain</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-5 shadow-card">
      <p class="text-sm font-medium text-ink-400">Balance</p>
      <p class="mt-2 text-2xl font-semibold tracking-tight {totalBalance > 0 ? 'text-danger' : 'text-ink-900'}">KES {totalBalance.toLocaleString()}</p>
      <p class="mt-1 text-xs text-ink-500">Obligation minus paid</p>
    </div>
  </div>

  <div class="mt-6">
    <DataTable
      data={rows}
      columns={[
        { key: 'admission_no', label: 'Adm No', sortable: true },
        { key: 'name', label: 'Student', sortable: true, render: (r: any) => `${r.first_name} ${r.last_name}` },
        { key: 'grade', label: 'Grade', sortable: true, render: (r: any) => r.grade ?? '—' },
        { key: 'obligation', label: 'Obligation', render: (r: any) => `KES ${Number(r.obligation ?? 0).toLocaleString()}` },
        { key: 'paid', label: 'Paid', render: (r: any) => `KES ${Number(r.paid ?? 0).toLocaleString()}`, sortable: true },
        { key: 'balance', label: 'Balance', sortable: true, render: (r: any) => {
          const b = Number(r.balance ?? 0);
          return `<span class="${b > 0 ? 'text-danger font-medium' : 'text-success'}">KES ${b.toLocaleString()}</span>`;
        } },
        { key: 'txn', label: '', render: (r: any) => `<a class="text-brand-600 hover:underline" href="/admin/reclass/students/${r.id}?domain=${domain}">Transactions →</a>` },
      ]}
      emptyMessage="No active students yet. Add students in SIS first."
    />
  </div>
</DashboardContent>
