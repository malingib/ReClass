<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { CalendarDays, Plus } from 'lucide-svelte';
  const { data } = $props(); const events = $derived(data.events ?? []);
  const format = (v: string) => new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
</script>
<svelte:head><title>School calendar · eShule</title></svelte:head>
<DashboardContent title="School calendar" subtitle="One operational calendar for teaching, exams, meetings, holidays and deadlines.">
  <div class="space-y-6">
    <section class="ui-card p-5 sm:p-6"><div class="flex items-center gap-2 mb-5"><Plus class="h-5 w-5 text-primary"/><h2 class="text-lg font-semibold">Add event</h2></div>
      <form method="POST" action="?/create" class="grid gap-4 md:grid-cols-2">
        <label class="text-sm">Title<input name="title" required class="ui-input mt-1 w-full"/></label>
        <label class="text-sm">Type<select name="event_type" class="ui-input mt-1 w-full"><option>school</option><option>exam</option><option>meeting</option><option>holiday</option><option>activity</option><option>deadline</option><option>other</option></select></label>
        <label class="text-sm">Starts<input name="starts_at" type="datetime-local" required class="ui-input mt-1 w-full"/></label>
        <label class="text-sm">Ends<input name="ends_at" type="datetime-local" class="ui-input mt-1 w-full"/></label>
        <label class="text-sm">Audience<select name="audience" class="ui-input mt-1 w-full"><option>staff</option><option>teachers</option><option>parents</option><option>all</option></select></label>
        <label class="text-sm">Location<input name="location" class="ui-input mt-1 w-full"/></label>
        <label class="text-sm md:col-span-2">Description<textarea name="description" rows="2" class="ui-input mt-1 w-full"></textarea></label>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="all_day"/> All day</label>
        <div><button class="ui-action ui-action-primary"><Plus class="h-4 w-4"/>Add event</button></div>
      </form>
    </section>
    <section class="ui-card overflow-hidden"><div class="border-b border-border/60 px-5 py-4"><h2 class="text-lg font-semibold">Upcoming events</h2></div>
      {#if events.length === 0}<div class="p-10 text-center"><CalendarDays class="mx-auto h-8 w-8 text-ink-300"/><p class="mt-3 text-sm font-semibold">No events scheduled</p></div>{:else}<div class="divide-y divide-border/60">{#each events as e}<article class="p-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 class="font-semibold text-ink-900">{e.title}</h3><p class="mt-1 text-xs text-ink-500">{format(e.starts_at)}{e.ends_at ? ` – ${format(e.ends_at)}` : ''} · {e.event_type} · {e.audience}</p>{#if e.location}<p class="mt-1 text-xs text-ink-500">{e.location}</p>{/if}{#if e.description}<p class="mt-2 text-sm text-ink-600">{e.description}</p>{/if}</div><span class="ui-status ui-status-info">{e.event_type}</span></article>{/each}</div>{/if}
    </section>
  </div>
</DashboardContent>
