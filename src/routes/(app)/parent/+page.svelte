<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';

  const { data } = $props();
  const students = $derived(data.students);
  const payments = $derived(data.payments);
  const announcements = $derived(data.announcements);
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

  {#if announcements.length > 0}
    <div class="space-y-3">
      <h3 class="text-sm font-semibold text-slate-900">Announcements</h3>
      {#each announcements as a}
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-semibold text-slate-900">{a.title}</h4>
                {#if a.priority === 'urgent'}
                  <span class="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">Urgent</span>
                {:else if a.priority === 'high'}
                  <span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">High</span>
                {/if}
              </div>
              <p class="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{a.body}</p>
              {#if a.published_at}
                <p class="mt-2 text-[11px] text-slate-400">{new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</DashboardContent>
