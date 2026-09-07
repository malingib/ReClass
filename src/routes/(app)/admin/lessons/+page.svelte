<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Plus } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import { dispatchToast } from '$lib/notifications';
  const { data } = $props();
  let open = $state(false);
  const lessons = $derived(data.lessons);
  function submit() { return async ({ result, update }: any) => { if (result.type === 'success') { open = false; dispatchToast('Saved', result.data?.message ?? 'Saved'); } else if (result.type === 'failure') dispatchToast('Error', result.data?.message ?? 'Could not save'); await update(); }; }
</script>

<DashboardContent title="Lessons" subtitle="Operational timetable and lesson scheduling — not an LMS">
  {#snippet headerActions()}<Button size="sm" onclick={() => open = true}><Plus class="h-3.5 w-3.5" /> Schedule Lesson</Button>{/snippet}
  <div class="space-y-3">
    {#each lessons as l}
      <div class="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0"><p class="text-sm font-semibold">{l.subjects?.name ?? 'Lesson'} · {l.sis_classes?.name ?? 'Class'}{l.sis_classes?.stream ? ` · ${l.sis_classes.stream}` : ''}</p><p class="text-xs text-muted-foreground">{l.teachers?.first_name} {l.teachers?.last_name} · {new Date(l.starts_at).toLocaleString()} → {new Date(l.ends_at).toLocaleTimeString()}</p><p class="text-xs text-muted-foreground">{l.room ?? 'No room'} · <span class="capitalize">{l.status}</span></p></div>
        {#if l.status === 'scheduled'}<form method="POST" action="?/cancel" use:enhance><input type="hidden" name="id" value={l.id} /><button class="text-left text-xs text-muted-foreground hover:text-destructive">Cancel</button></form>{/if}
      </div>
    {:else}<div class="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">No lessons scheduled. Schedule the first operational lesson for your school.</div>{/each}
  </div>
</DashboardContent>

{#if open}
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"><div class="border-b px-6 py-4"><h2 class="font-semibold">Schedule Lesson</h2><p class="mt-1 text-xs text-muted-foreground">Assign a teacher, subject and canonical SIS class.</p></div><form method="POST" action="?/create" use:enhance={submit} class="grid gap-4 px-6 py-5">
  <label class="text-xs font-medium">Teacher<select name="teacher_id" required class="field"><option value="">Select teacher</option>{#each data.teachers as t}<option value={t.id}>{t.first_name} {t.last_name}</option>{/each}</select></label>
  <label class="text-xs font-medium">Subject<select name="subject_id" class="field"><option value="">Select subject</option>{#each data.subjects as s}<option value={s.id}>{s.name}</option>{/each}</select></label>
  <label class="text-xs font-medium">Class / stream<select name="class_id" required class="field"><option value="">Select class</option>{#each data.classes as c}<option value={c.id}>{c.name}{c.stream ? ` · ${c.stream}` : ''} · {c.academic_year ?? ''}</option>{/each}</select></label>
  <div class="grid gap-4 sm:grid-cols-2"><label class="text-xs font-medium">Starts<input name="starts_at" type="datetime-local" required class="field" /></label><label class="text-xs font-medium">Ends<input name="ends_at" type="datetime-local" required class="field" /></label></div>
  <label class="text-xs font-medium">Room<input name="room" class="field" placeholder="e.g. Room 4" /></label><label class="text-xs font-medium">Notes<textarea name="notes" rows="2" class="field" placeholder="Optional operational notes"></textarea></label>
  <div class="flex justify-end gap-2"><Button type="button" variant="outline" onclick={() => open = false}>Cancel</Button><Button type="submit">Schedule</Button></div>
</form></div></div>
{/if}
<style>:global(.field){width:100%;margin-top:.3rem;border:1px solid hsl(var(--border));border-radius:.5rem;padding:.55rem .7rem;font-size:.875rem;outline:none}</style>
