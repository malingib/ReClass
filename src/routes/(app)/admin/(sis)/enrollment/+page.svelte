<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Plus } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import { dispatchToast } from '$lib/notifications';
  const { data } = $props();
  let open = $state(false);
  let submitting = $state(false);
  const enrollments = $derived(data.enrollments);
  function submit() { submitting = true; return async ({ result, update }: any) => { if (result.type === 'success') { open = false; dispatchToast('Saved', result.data?.message ?? 'Saved'); } else if (result.type === 'failure') dispatchToast('Error', result.data?.message ?? 'Could not enroll'); await update(); submitting = false; }; }
</script>

<DashboardContent title="Enrollment" subtitle="Assign students to an academic year, year group and stream without overwriting history">
  {#snippet headerActions()}
    <Button size="sm" onclick={() => (open = true)}><Plus class="h-3.5 w-3.5" /> Enroll Student</Button>
  {/snippet}
  <div class="overflow-hidden rounded-xl border border-border bg-white">
    <div class="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground"><span>Student</span><span>Academic Year</span><span>Year Group</span><span>Stream</span><span>Status</span></div>
    {#each enrollments as e}
      <div class="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b border-border px-4 py-3 last:border-0"><div><p class="text-sm font-medium">{e.students?.first_name} {e.students?.last_name}</p><p class="text-[11px] text-muted-foreground">{e.students?.admission_no}</p></div><span class="text-sm">{e.academic_years?.name ?? '—'}</span><span class="text-sm">{e.year_groups?.name ?? '—'}</span><span class="text-sm">{e.streams?.name ?? '—'}</span><span class="capitalize text-sm">{e.status}</span></div>
    {:else}<div class="px-6 py-12 text-center text-sm text-muted-foreground">No enrollments recorded yet.</div>{/each}
  </div>
</DashboardContent>

{#if open}
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div class="w-full max-w-lg rounded-2xl border border-border bg-white shadow-xl"><div class="border-b border-border px-6 py-4"><h2 class="font-semibold">Enroll Student</h2><p class="text-xs text-muted-foreground">Creates a new historical enrollment record.</p></div>
<form method="POST" action="?/create" use:enhance={submit} class="grid gap-4 px-6 py-5">
<label class="space-y-1 text-xs font-medium">Student<select name="student_id" required class="field"><option value="">Select student</option>{#each data.students as s}<option value={s.id}>{s.admission_no} — {s.first_name} {s.last_name}</option>{/each}</select></label>
<label class="space-y-1 text-xs font-medium">Academic Year<select name="academic_year_id" required class="field"><option value="">Select year</option>{#each data.years as y}<option value={y.id}>{y.name}</option>{/each}</select></label>
<label class="space-y-1 text-xs font-medium">Year Group<select name="year_group_id" required class="field"><option value="">Select group</option>{#each data.groups as g}<option value={g.id}>{g.name}</option>{/each}</select></label>
<label class="space-y-1 text-xs font-medium">Stream<select name="stream_id" class="field"><option value="">No stream</option>{#each data.streams as s}<option value={s.id}>{s.name}</option>{/each}</select></label>
<label class="space-y-1 text-xs font-medium">Enrollment Date<input name="enrolled_on" type="date" required class="field" value={new Date().toISOString().slice(0,10)} /></label>
<div class="flex justify-end gap-2"><Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Enroll'}</Button></div>
</form></div></div>
{/if}
<style>:global(.field){width:100%;border:1px solid hsl(var(--border));border-radius:.5rem;padding:.55rem .7rem;font-size:.875rem;font-weight:400;outline:none}</style>
