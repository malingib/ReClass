<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const reports = [
    { title: 'Teacher attendance', detail: 'Trends, absences, and chronic lateness', icon: 'attendance' },
    { title: 'Remedial session coverage', detail: 'Which cohorts and subjects have full coverage', icon: 'scheduling' },
    { title: 'Parent M-Pesa collections', detail: 'STK pushes, paybill reconciliation, aging', icon: 'payments' },
    { title: 'Revenue per term', detail: 'Term-by-term revenue with collection rate', icon: 'revenue' },
  ];
</script>

<DashboardContent title="Reports" subtitle="Exports that feed principal weekly reviews">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each reports as report}
      <a
        href="/bursar/export"
        class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
      >
        <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
        </span>
        <div>
          <h3 class="text-sm font-semibold text-ink-900">{report.title}</h3>
          <p class="mt-1 text-xs text-ink-500">{report.detail}</p>
        </div>
        <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
          Export CSV / PDF
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
        </span>
      </a>
    {/each}
  </div>
</DashboardContent>
