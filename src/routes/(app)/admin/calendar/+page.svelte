<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { CalendarDays, Plus, Clock3 } from 'lucide-svelte';
  const { data } = $props();
  const events = $derived(data.events ?? []);
  const time = (value: string | null | undefined) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
</script>

<svelte:head><title>School calendar · eShule</title><meta name="description" content="Plan school events, exams, meetings, holidays and deadlines." /></svelte:head>

<DashboardContent title="School calendar" subtitle="Keep the school day, key dates and teacher-facing deadlines in one operational calendar.">
  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
    <section class="ui-card overflow-hidden">
      <div class="flex items-center justify-between border-b border-border/60 px-5 py-4 sm:px-6">
        <div><h2 class="text-lg font-semibold text-ink-900">Upcoming events</h2><p class="mt-1 text-sm text-ink-400">The next 60 days plus the last week.</p></div>
        <CalendarDays class="h-5 w-5 text-primary" />
      </div>
      {#if events.length === 0}
        <div class="p-12 text-center"><CalendarDays class="mx-auto h-9 w-9 text-ink-300" /><p class="mt-3 text-sm font-semibold text-ink-700">Calendar is clear</p><p class="mt-1 text-xs text-ink-400">Add the first event to start coordinating the school.</p></div>
      {:else}
        <div class="divide-y divide-border/60">
          {#each events as event}
            <article class="px-5 py-4 sm:px-6">
              <div class="flex items-start justify-between gap-4"><div class="min-w-0"><div class="flex items-center gap-2"><span class="ui-status ui-status-info">{event.event_type}</span><span class="text-xs text-ink-400">{event.audience}</span></div><h3 class="mt-2 text-sm font-semibold text-ink-900">{event.title}</h3></div><p class="shrink-0 text-right text-xs text-ink-500">{time(event.starts_at)}</p></div>
              {#if event.description}<p class="mt-2 text-sm leading-5 text-ink-500">{event.description}</p>{/if}
              <div class="mt-3 flex flex-wrap gap-3 text-xs text-ink-400"><span class="inline-flex items-center gap-1"><Clock3 class="h-3.5 w-3.5" />{event.all_day ? 'All day' : `${new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${event.ends_at ? `–${new Date(event.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}</span>{#if event.location}<span>· {event.location}</span>{/if}</div>
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <section class="ui-card h-fit p-5 sm:p-6">
      <div class="flex items-center gap-2"><Plus class="h-5 w-5 text-primary" /><div><h2 class="text-lg font-semibold text-ink-900">Add event</h2><p class="mt-1 text-sm text-ink-400">Create a shared school date.</p></div></div>
      <form method="POST" action="?/create" class="mt-5 space-y-4">
        <label class="block"><span class="ui-label">Title</span><input name="title" required class="ui-input mt-1 w-full" placeholder="e.g. Mid-term exams" /></label>
        <div class="grid grid-cols-2 gap-3"><label class="block"><span class="ui-label">Type</span><select name="event_type" class="ui-input mt-1 w-full"><option value="school">School</option><option value="exam">Exam</option><option value="meeting">Meeting</option><option value="holiday">Holiday</option><option value="activity">Activity</option><option value="deadline">Deadline</option><option value="other">Other</option></select></label><label class="block"><span class="ui-label">Audience</span><select name="audience" class="ui-input mt-1 w-full"><option value="staff">Staff</option><option value="teachers">Teachers</option><option value="parents">Parents</option><option value="all">Everyone</option></select></label></div>
        <label class="block"><span class="ui-label">Starts</span><input name="starts_at" type="datetime-local" required class="ui-input mt-1 w-full" /></label>
        <label class="block"><span class="ui-label">Ends (optional)</span><input name="ends_at" type="datetime-local" class="ui-input mt-1 w-full" /></label>
        <label class="flex items-center gap-2 text-sm text-ink-600"><input name="all_day" type="checkbox" /> All day</label>
        <label class="block"><span class="ui-label">Location</span><input name="location" class="ui-input mt-1 w-full" placeholder="Optional" /></label>
        <label class="block"><span class="ui-label">Description</span><textarea name="description" rows="3" class="ui-input mt-1 w-full" placeholder="What should staff know?"></textarea></label>
        {#if data.error}<p class="text-sm text-red-600">{data.error}</p>{/if}
        <button class="ui-action ui-action-primary min-h-11 w-full justify-center">Create event</button>
      </form>
    </section>
  </div>
</DashboardContent>
