<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Skeleton } from '@eshule/shared';

  const { data } = $props();
  const students = $derived(data.students);
  const payments = $derived(data.payments);
  const announcements = $derived(data.announcements);
  const loading = $derived(!students && !payments);
</script>

<DashboardContent title="Welcome back" subtitle="Your child's remedial schedule and M-Pesa payments">
  <div class="space-y-8">
    <!-- Main Content Grid -->
    <div class="grid gap-6 lg:grid-cols-2">
      {#if loading}
        <!-- Children Skeleton -->
        <div class="rounded-xl border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
          <Skeleton class="h-5 w-32 mb-4" />
          <div class="space-y-3">
            {#each Array(3) as _}
              <div class="flex items-center gap-3">
                <Skeleton class="h-4 w-16" />
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-4 w-16" />
              </div>
            {/each}
          </div>
        </div>
        <!-- Payments Skeleton -->
        <div class="rounded-xl border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
          <Skeleton class="h-5 w-32 mb-4" />
          <div class="space-y-3">
            {#each Array(3) as _}
              <div class="flex items-center gap-3">
                <Skeleton class="h-4 w-20" />
                <Skeleton class="h-4 w-24" />
                <Skeleton class="h-4 w-16" />
                <Skeleton class="h-4 w-16" />
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="anim-card stagger-1 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]">
          <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h3 class="text-base font-semibold text-slate-900">Linked children</h3>
            </div>
          </div>
          <div class="p-0">
            <DataTable data={students} columns={[
              { key: 'admission_no', label: 'Adm No', sortable: true },
              { key: 'first_name', label: 'Name', render: (s: any) => `${s.first_name} ${s.last_name}` },
              { key: 'grade', label: 'Cohort' },
            ]} emptyMessage="No children linked" />
          </div>
        </div>

        <div class="anim-card stagger-2 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]">
          <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <h3 class="text-base font-semibold text-slate-900">Recent payments</h3>
            </div>
          </div>
          <div class="p-0">
            <DataTable data={payments} columns={[
              { key: 'created_at', label: 'Date', render: (p: any) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '—' },
              { key: 'fee_type', label: 'Fee' },
              { key: 'amount', label: 'Amount', render: (p: any) => `KES ${Number(p.amount).toLocaleString()}` },
              { key: 'channel', label: 'Channel', render: (p: any) => p.domain === 'remedial' ? 'M-Pesa' : (p.method ?? 'Bank') },
            ]} emptyMessage="No payments yet" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Announcements -->
    {#if announcements.length > 0}
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900">Announcements</h3>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each announcements as a, i}
            <div class="anim-card group overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]" style:animation-delay="{0.3 + i * 0.05}s">
              <div class="p-5">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-semibold text-slate-900">{a.title}</h4>
                      {#if a.priority === 'urgent'}
                        <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Urgent</span>
                      {:else if a.priority === 'high'}
                        <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">High</span>
                      {/if}
                    </div>
                    <p class="mt-2 text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{a.body}</p>
                  </div>
                </div>
                {#if a.published_at}
                  <div class="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</DashboardContent>
