<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import DataTable from '$lib/components/DataTable.svelte';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';
  import { CalendarDays, ClipboardCheck, CreditCard, ArrowRight, Users, CircleCheck } from 'lucide-svelte';

  const { data } = $props();
  const stat = $derived(data.stat);
  const recentPayments = $derived(data.recentPayments ?? []);
  const activity = $derived(data.activity ?? []);
  const error = $derived(data.error);

  const attendanceRate = $derived(Number(stat.attendanceRate ?? 0));
  const activeSessions = $derived(Number(stat.activeSessions ?? 0));
</script>

<svelte:head><title>ReClass today · eShule</title><meta name="description" content="ReClass remedial operations workspace for sessions, attendance, payments and delivery." /></svelte:head>

<DashboardContent title="ReClass today" subtitle="Run the remedial programme from sessions and exceptions, not from a dashboard of charts.">
  <div class="space-y-7">
    {#if error}
      <Alert variant="destructive" class="border-red-200 bg-red-50" role="alert">
        <AlertTitle class="text-red-800">ReClass could not load</AlertTitle>
        <AlertDescription class="text-red-700">{error}. Your existing records are unchanged.</AlertDescription>
        <Button variant="outline" size="sm" class="mt-4 min-h-11" onclick={() => window.location.reload()}>Retry</Button>
      </Alert>
    {:else}
      <section class="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-white p-6 shadow-card sm:p-8">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">Remedial programme · ReClass owned</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">Keep today's learning moving.</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-ink-500">Start with sessions that need delivery, then clear attendance and payment work. ReClass owns remedial operations; school finance remains with the Bursar.</p>
          </div>
          <a href="/admin/scheduling" class="ui-action ui-action-primary min-h-11 shrink-0">Open schedule <ArrowRight class="h-4 w-4" /></a>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">Today's sessions</p><p class="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{stat.upcomingOccurrences ?? 0}</p><p class="mt-1 text-[11px] text-ink-400">Scheduled occurrences</p></div>
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">Teacher attendance</p><p class="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{attendanceRate}%</p><p class="mt-1 text-[11px] text-ink-400">Last 14 days</p></div>
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">M-Pesa collected</p><p class="mt-1 text-2xl font-bold text-ink-900 tabular-nums">KES {(stat.mpesaCollected ?? 0).toLocaleString()}</p><p class="mt-1 text-[11px] text-ink-400">{stat.mpesaPayments ?? 0} receipts</p></div>
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p class="text-xs text-ink-400">Active sessions</p><p class="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{activeSessions}</p><p class="mt-1 text-[11px] text-ink-400">Scheduled programme</p></div>
        </div>
      </section>

      <section aria-labelledby="workflow-title">
        <div class="mb-4"><h2 id="workflow-title" class="text-lg font-semibold text-ink-900">Today's delivery workflow</h2><p class="mt-1 text-sm text-ink-400">Delivery first, evidence second, finance handoff last.</p></div>
        <div class="grid gap-3 lg:grid-cols-3">
          <a href="/admin/scheduling" class="group rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov">
            <span class="ui-status ui-status-neutral">1 · Deliver</span><h3 class="mt-3 text-sm font-semibold text-ink-900">Run today's sessions</h3><p class="mt-1 text-xs leading-5 text-ink-500">Open the schedule, confirm the teacher and session details, and keep the programme moving.</p><span class="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">Open schedule <ArrowRight class="h-3.5 w-3.5" /></span>
          </a>
          <a href="/admin/attendance" class="group rounded-2xl border border-border/60 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov">
            <span class="ui-status ui-status-warning">2 · Evidence</span><h3 class="mt-3 text-sm font-semibold text-ink-900">Clear attendance</h3><p class="mt-1 text-xs leading-5 text-ink-500">Review teacher attendance records that support delivery reporting and payroll evidence.</p><span class="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">Review attendance <ArrowRight class="h-3.5 w-3.5" /></span>
          </a>
          <a href="/admin/reclass/students" class="group rounded-2xl border border-border/60 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov">
            <span class="ui-status ui-status-success">3 · Outcome</span><h3 class="mt-3 text-sm font-semibold text-ink-900">Review learner progress</h3><p class="mt-1 text-xs leading-5 text-ink-500">Use the student ledger to see remedial participation and fee position by learner.</p><span class="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">Open ledger <ArrowRight class="h-3.5 w-3.5" /></span>
          </a>
        </div>
      </section>

      <section aria-labelledby="actions-title">
        <div class="mb-4"><h2 id="actions-title" class="text-lg font-semibold text-ink-900">Programme actions</h2><p class="mt-1 text-sm text-ink-400">Supporting tools for scheduling, attendance and remedial payments.</p></div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a href="/admin/scheduling" class="ui-card group"><CalendarDays class="h-5 w-5 text-primary" /><h3 class="mt-3 text-sm font-semibold text-ink-900">Schedule sessions</h3><p class="mt-1 text-xs leading-5 text-ink-500">Set teachers, rooms and times for remedial delivery.</p></a>
          <a href="/admin/attendance" class="ui-card group"><ClipboardCheck class="h-5 w-5 text-primary" /><h3 class="mt-3 text-sm font-semibold text-ink-900">Review attendance</h3><p class="mt-1 text-xs leading-5 text-ink-500">Approve delivery records that become teacher payroll evidence.</p></a>
          <a href="/admin/parent-payments" class="ui-card group"><CreditCard class="h-5 w-5 text-primary" /><h3 class="mt-3 text-sm font-semibold text-ink-900">Parent payments</h3><p class="mt-1 text-xs leading-5 text-ink-500">Monitor remedial M-Pesa payments and receipts.</p></a>
          <a href="/admin/reclass/students" class="ui-card group"><Users class="h-5 w-5 text-primary" /><h3 class="mt-3 text-sm font-semibold text-ink-900">Student ledger</h3><p class="mt-1 text-xs leading-5 text-ink-500">See remedial participation and fee position by learner.</p></a>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
        <div class="flex items-center justify-between border-b border-border/60 px-5 py-4 sm:px-6">
          <div><div class="flex items-center gap-2"><CircleCheck class="h-4 w-4 text-emerald-600" /><h2 class="text-lg font-semibold text-ink-900">Recent remedial payments</h2></div><p class="mt-1 text-sm text-ink-400">Actual payment evidence for the remedial domain.</p></div>
          <a href="/admin/parent-payments" class="min-h-11 inline-flex items-center text-xs font-semibold text-primary hover:underline">View all →</a>
        </div>
        <DataTable data={recentPayments.slice(0, 6)} columns={[{ key: 'student_name', label: 'Student', render: (r: any) => r.student_name ?? '—' }, { key: 'amount', label: 'Paid', render: (r: any) => `KES ${Number(r.amount ?? 0).toLocaleString()}` }, { key: 'channel', label: 'Channel', render: (r: any) => r.domain === 'remedial' ? 'M-Pesa' : (r.method ?? 'Bank') }]} emptyMessage="No remedial payments yet. Parent payments will appear here once recorded." />
      </section>

      {#if activity.length > 0}<RecentActivity activity={activity} />{/if}
    {/if}
  </div>
</DashboardContent>
