<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';

  const { data } = $props();
  const stats = $derived(data.stats);
</script>

<DashboardContent title="Reports" subtitle="Exports that feed principal weekly reviews">
  {#snippet headerActions()}
    <div class="flex items-center gap-2">
      <Button variant="secondary" size="sm" onclick={() => window.print()}>Print / PDF</Button>
      <a href="/admin/reports/teacher-attendance-csv" download>
        <Button variant="secondary" size="sm">Teacher Attendance CSV</Button>
      </a>
      <a href="/admin/reports/revenue-csv" download>
        <Button variant="secondary" size="sm">Revenue CSV</Button>
      </a>
    </div>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Teacher Attendance" value={`${stats.attendanceRate}%`} sub={`${stats.attendanceTotal} total records`} />
    <KpiCard label="Absences Recorded" value={stats.absenteeCount} sub="Marked absent" />
    <KpiCard label="Sessions Covered" value={stats.sessionsCovered} sub="Completed sessions" />
    <KpiCard label="Revenue Collected" value={`KES ${stats.totalPayments.toLocaleString()}`} sub={`${stats.paidInvoices} paid invoices`} />
  </div>

  <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a
      href="/admin/reports/teacher-attendance-csv"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Teacher Attendance Report</h3>
        <p class="mt-1 text-xs text-ink-500">Attendance by teacher and period — CSV download</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
        Download CSV
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a
      href="/admin/reports/revenue-csv"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Revenue Report</h3>
        <p class="mt-1 text-xs text-ink-500">Collections by term — CSV download</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
        Download CSV
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a
      href="/bursar/export"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Invoice Export</h3>
        <p class="mt-1 text-xs text-ink-500">All invoices with payment status — CSV</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
        Open export
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
  </div>
</DashboardContent>
