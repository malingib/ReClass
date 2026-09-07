<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte'; import { History, Plus } from 'lucide-svelte';
  const { data } = $props(); const events = $derived(data.events ?? []); const students = $derived(data.students ?? []);
  const name = (id: string) => { const s = students.find((x: any) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : 'Student'; };
</script>
<svelte:head><title>Student lifecycle · eShule</title></svelte:head>
<DashboardContent title="Student lifecycle" subtitle="Keep the student's journey visible from admission and enrollment through transfer, graduation or withdrawal.">
  <div class="space-y-6">
    <section class="ui-card p-5 sm:p-6"><div class="flex items-center gap-2 mb-5"><Plus class="h-5 w-5 text-primary"/><h2 class="text-lg font-semibold">Record lifecycle event</h2></div><form method="POST" action="?/create" class="grid gap-4 md:grid-cols-2">
      <label class="text-sm">Student<select name="student_id" required class="ui-input mt-1 w-full"><option value="">Select student</option>{#each students as s}<option value={s.id}>{s.first_name} {s.last_name} · {s.admission_no}</option>{/each}</select></label>
      <label class="text-sm">Date<input name="event_date" type="date" value={new Date().toISOString().slice(0,10)} class="ui-input mt-1 w-full"/></label>
      <label class="text-sm">Event<select name="event_type" required class="ui-input mt-1 w-full"><option value="admitted">Admitted</option><option value="enrolled">Enrolled</option><option value="class_changed">Class changed</option><option value="transferred">Transferred</option><option value="graduated">Graduated</option><option value="withdrawn">Withdrawn</option><option value="reactivated">Reactivated</option><option value="note">Note</option></select></label>
      <label class="text-sm">Notes<textarea name="notes" rows="2" class="ui-input mt-1 w-full"></textarea></label><div><button class="ui-action ui-action-primary"><Plus class="h-4 w-4"/>Record event</button></div>
    </form></section>
    <section class="ui-card overflow-hidden"><div class="border-b border-border/60 px-5 py-4"><h2 class="text-lg font-semibold">Timeline</h2></div>{#if events.length === 0}<div class="p-10 text-center"><History class="mx-auto h-8 w-8 text-ink-300"/><p class="mt-3 text-sm font-semibold">No lifecycle events recorded</p></div>{:else}<div class="divide-y divide-border/60">{#each events as e}<div class="p-5"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-ink-900">{name(e.student_id)}</p><p class="mt-1 text-xs text-ink-500">{e.event_date} · {e.event_type.replace('_',' ')}</p>{#if e.notes}<p class="mt-2 text-sm text-ink-600">{e.notes}</p>{/if}</div><span class="ui-status ui-status-info">Lifecycle</span></div></div>{/each}</div>{/if}</section>
  </div>
</DashboardContent>
