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
    <KpiCard label="M-Pesa Receipts" value={stats.remedialPayments} sub="Remedial fees" />
    <KpiCard label="Revenue Collected" value={`KES ${stats.totalPayments.toLocaleString()}`} sub={`${stats.schoolPayments} school · ${stats.remedialPayments} M-Pesa`} />
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
      href="/admin/reports/students-csv"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Students Export</h3>
        <p class="mt-1 text-xs text-ink-500">All enrolled students — CSV download</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
        Download CSV
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a
      href="/admin/reports/teachers-csv"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Teachers Export</h3>
        <p class="mt-1 text-xs text-ink-500">All active teachers — CSV download</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
        Download CSV
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a
      href="/admin/reports/subjects-csv"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Subjects Export</h3>
        <p class="mt-1 text-xs text-ink-500">All subjects on offer — CSV download</p>
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
        <h3 class="text-sm font-semibold text-ink-900">Receipts Export</h3>
        <p class="mt-1 text-xs text-ink-500">All payment receipts — CSV</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
        Open export
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
  </div>
</DashboardContent>
