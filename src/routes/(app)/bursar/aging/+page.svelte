<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const aging = $derived(data.aging ?? []);
  const buckets = $derived(data.buckets ?? {});
  const totalOutstanding = $derived(data.totalOutstanding ?? 0);

  function bucketColor(bucket: string) {
    const map: Record<string, string> = {
      current: 'bg-brand-50 text-brand-700',
      '1–30 days': 'bg-amber-50 text-amber-700',
      '31–60 days': 'bg-orange-50 text-orange-700',
      '61–90 days': 'bg-red-50 text-red-700',
      '90+ days': 'bg-danger/10 text-danger',
    };
    return map[bucket] ?? 'bg-ink-100 text-ink-600';
  }

  function bucketBg(bucket: string) {
    const map: Record<string, string> = {
      current: 'border-brand-200',
      '1–30 days': 'border-amber-200',
      '31–60 days': 'border-orange-200',
      '61–90 days': 'border-red-200',
      '90+ days': 'border-danger/30',
    };
    return map[bucket] ?? 'border-border';
  }
</script>

<DashboardContent title="Aging" subtitle="Parental M-Pesa payments overdue by period">
  <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
    {#each Object.entries(buckets) as [label, amount]}
      <div class="rounded-xl border {bucketBg(label)} bg-white p-4 shadow-card">
        <p class="text-xs font-medium text-ink-500">{label}</p>
        <p class="mt-1 text-lg font-semibold text-ink-900">KES {Number(amount).toLocaleString()}</p>
      </div>
    {/each}
    <div class="rounded-xl border border-brand-200 bg-brand-50 p-4 shadow-card sm:col-span-5">
      <p class="text-xs font-medium text-brand-700">Total Outstanding</p>
      <p class="mt-1 text-2xl font-bold text-brand-900">KES {totalOutstanding.toLocaleString()}</p>
    </div>
  </div>

  <DataTable
    data={aging}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Admission No' },
      { key: 'amount_due', label: 'Amount Due', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}`, sortable: true },
      {
        key: 'outstanding',
        label: 'Outstanding',
        render: (i: any) => `KES ${Number(i.outstanding).toLocaleString()}`,
        sortable: true,
      },
      {
        key: 'due_date',
        label: 'Due Date',
        render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—',
        sortable: true,
      },
      { key: 'daysOverdue', label: 'Days Overdue', sortable: true },
      {
        key: 'bucket',
        label: 'Bucket',
        render: (i: any) =>
          `<span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${bucketColor(i.bucket)}">${i.bucket}</span>`,
      },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No overdue invoices — all payments are current."
  />
</DashboardContent>
