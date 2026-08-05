<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import Button from '$lib/components/ui/button.svelte';

  const { data } = $props();
  const s = $derived(data.stats);
</script>

<DashboardContent title="Communications" subtitle="Announcements, messaging and notification templates">
  {#snippet headerActions()}
    <!-- Create action is intentionally not wired yet (read-only audit pass) -->
    <Button variant="secondary" size="sm" disabled title="Creating announcements is coming soon">New Announcement (coming soon)</Button>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label="Announcements" value={s.announcements} sub={`${s.published} published`} />
    <KpiCard label="Templates" value={s.templates} sub="Message templates" />
    <KpiCard label="Messages Sent" value={s.sentMessages} sub="Via SMS & email" />
  </div>

  <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/admin/communications/announcements"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.496.496 0 0 1-.674-.223 12.5 12.5 0 0 1-.84-2.05m0-9.18a12.5 12.5 0 0 1 .84-2.05.497.497 0 0 1 .674-.223l.657.38c.523.302.71.962.463 1.511a12.06 12.06 0 0 0-.985 2.783m0 0a12.06 12.06 0 0 0 2.146 1.16 12.06 12.06 0 0 0 2.146-1.16" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Announcements</h3>
        <p class="mt-1 text-xs text-ink-500">Create and publish school-wide announcements.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-orange-700 group-hover:text-orange-800">
        Manage Announcements
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/communications/templates"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Message Templates</h3>
        <p class="mt-1 text-xs text-ink-500">Create reusable SMS and email templates.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-cyan-700 group-hover:text-cyan-800">
        Manage Templates
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
    <a href="/admin/notifications"
      class="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Z" />
        </svg>
      </span>
      <div>
        <h3 class="text-sm font-semibold text-ink-900">Message Log</h3>
        <p class="mt-1 text-xs text-ink-500">View sent SMS and email notification history.</p>
      </div>
      <span class="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-slate-700 group-hover:text-slate-800">
        View Log
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
      </span>
    </a>
  </div>
</DashboardContent>
