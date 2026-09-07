<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { CheckCircle2, ClipboardCheck, Clock3 } from 'lucide-svelte';
  const { data } = $props(); const tasks = $derived(data.tasks ?? []);
  const fmt = (v: string) => new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const dueClass = (v: string, status: string) => status === 'completed' ? 'ui-status-success' : new Date(v) < new Date() ? 'ui-status-danger' : 'ui-status-info';
</script>
<svelte:head><title>My tasks · eShule</title></svelte:head>
<DashboardContent title="My tasks" subtitle="Teaching follow-ups and school reminders, ordered by what is due next.">
  <section class="ui-card overflow-hidden">
    <div class="border-b border-border/60 px-5 py-4 sm:px-6"><div class="flex items-center gap-2"><ClipboardCheck class="h-5 w-5 text-primary"/><div><h2 class="text-lg font-semibold">Task queue</h2><p class="mt-1 text-sm text-ink-400">Automatic in-app reminders are generated before due times.</p></div></div></div>
    {#if tasks.length === 0}<div class="p-10 text-center"><CheckCircle2 class="mx-auto h-8 w-8 text-emerald-500"/><p class="mt-3 text-sm font-semibold text-ink-700">Nothing pending</p><p class="mt-1 text-xs text-ink-400">You're clear for now.</p></div>{:else}<div class="divide-y divide-border/60">{#each tasks as task}<article class="p-5"><div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div class="flex items-center gap-2"><Clock3 class="h-4 w-4 text-primary"/><h3 class="font-semibold text-ink-900">{task.title}</h3></div>{#if task.description}<p class="mt-2 text-sm text-ink-500">{task.description}</p>{/if}<p class="mt-2 text-xs text-ink-500">Due {fmt(task.due_at)} · {task.priority}</p></div><div class="flex items-center gap-2"><span class="ui-status {dueClass(task.due_at, task.status)}">{task.status === 'completed' ? 'Completed' : new Date(task.due_at) < new Date() ? 'Overdue' : 'Open'}</span>{#if task.status !== 'completed' && task.status !== 'cancelled'}<form method="POST" action="?/complete"><input type="hidden" name="id" value={task.id}/><button class="ui-action ui-action-primary min-h-10"><CheckCircle2 class="h-4 w-4"/>Complete</button></form>{/if}</div></div></article>{/each}</div>{/if}
  </section>
</DashboardContent>
