<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { ClipboardCheck, Plus } from 'lucide-svelte';
  const { data } = $props(); const teachers = $derived(data.teachers ?? []); const tasks = $derived(data.tasks ?? []);
  const teacherName = (id: string) => { const t = teachers.find((x: any) => x.id === id); return t ? `${t.first_name} ${t.last_name}` : 'Teacher'; };
</script>
<svelte:head><title>Teacher tasks · eShule</title></svelte:head>
<DashboardContent title="Teacher tasks" subtitle="Assign follow-ups and let eShule remind teachers automatically.">
  <div class="space-y-6">
    <section class="ui-card p-5 sm:p-6"><div class="flex items-center gap-2 mb-5"><Plus class="h-5 w-5 text-primary"/><h2 class="text-lg font-semibold">Assign task</h2></div>
      <form method="POST" action="?/create" class="grid gap-4 md:grid-cols-2">
        <label class="text-sm">Teacher<select name="teacher_id" required class="ui-input mt-1 w-full"><option value="">Select teacher</option>{#each teachers as t}<option value={t.id}>{t.first_name} {t.last_name}</option>{/each}</select></label>
        <label class="text-sm">Due<input name="due_at" type="datetime-local" required class="ui-input mt-1 w-full"/></label>
        <label class="text-sm">Title<input name="title" required class="ui-input mt-1 w-full"/></label>
        <label class="text-sm">Priority<select name="priority" class="ui-input mt-1 w-full"><option>normal</option><option>low</option><option>high</option><option>urgent</option></select></label>
        <label class="text-sm">Reminder<select name="reminder_minutes" class="ui-input mt-1 w-full"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60" selected>1 hour</option><option value="120">2 hours</option><option value="1440">1 day</option></select></label>
        <label class="text-sm md:col-span-2">Details<textarea name="description" rows="2" class="ui-input mt-1 w-full"></textarea></label>
        <div><button class="ui-action ui-action-primary"><Plus class="h-4 w-4"/>Assign task</button></div>
      </form>
    </section>
    <section class="ui-card overflow-hidden"><div class="border-b border-border/60 px-5 py-4"><h2 class="text-lg font-semibold">Assigned work</h2></div>{#if tasks.length === 0}<div class="p-10 text-center"><ClipboardCheck class="mx-auto h-8 w-8 text-ink-300"/><p class="mt-3 text-sm font-semibold">No tasks assigned</p></div>{:else}<div class="divide-y divide-border/60">{#each tasks as t}<div class="p-5 flex items-center justify-between gap-4"><div><p class="font-semibold text-ink-900">{t.title}</p><p class="mt-1 text-xs text-ink-500">{teacherName(t.teacher_id)} · {new Date(t.due_at).toLocaleString('en-GB')} · {t.priority}</p></div><span class="ui-status {t.status === 'completed' ? 'ui-status-success' : 'ui-status-info'}">{t.status}</span></div>{/each}</div>{/if}</section>
  </div>
</DashboardContent>
