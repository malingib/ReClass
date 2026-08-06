<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  const { data } = $props();
  const s = $derived(data.stats);
</script>

<DashboardContent title="Student Information System" subtitle="Admissions, classes, enrollments and student records">
  {#snippet headerActions()}
    <a href="/admin/sis/admissions">
      <Button>New Admission</Button>
    </a>
    <a href="/admin/students">
      <Button variant="secondary">All Students</Button>
    </a>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Total Students" value={s.students} sub="Across all classes" />
    <KpiCard label="Active Enrollments" value={s.enrollments} sub="Currently enrolled" />
    <KpiCard label="Classes" value={s.classes} sub="Forms, streams & grades" />
    <KpiCard label="Admissions" value={s.admissions} sub="Total applications" />
  </div>

  <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/admin/sis/classes"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-foreground">Classes & Streams</h3>
        <p class="mt-1 text-xs text-muted-foreground">Manage forms, streams, and homeroom assignments.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-blue-700 group-hover:text-blue-800">
        Manage Classes
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/sis/admissions"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-foreground">Admissions</h3>
        <p class="mt-1 text-xs text-muted-foreground">Process new student applications and track admission status.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-amber-700 group-hover:text-amber-800">
        View Admissions
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/students"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-foreground">Student Records</h3>
        <p class="mt-1 text-xs text-muted-foreground">View and manage all student profiles and information.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
        View Students
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
  </div>
</DashboardContent>
