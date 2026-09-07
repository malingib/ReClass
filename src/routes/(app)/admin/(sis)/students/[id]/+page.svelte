<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { enhance } from '$app/forms';
  import { dispatchToast } from '$lib/notifications';
  const { data }: { data: any } = $props();
  const s = $derived(data.student);
  let showEvent = $state(false);
  let showExit = $state(false);
  function submit() { return async ({ result, update }: any) => { if (result.type === 'success') { showEvent = false; showExit = false; dispatchToast('Saved', result.data?.message ?? 'Saved'); } else if (result.type === 'failure') dispatchToast('Error', result.data?.message ?? 'Could not save'); await update(); }; }
  const displayName = $derived([s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '));
  const current = $derived(data.enrollments?.find((e: any) => e.status === 'active') ?? data.enrollments?.[0]);
  const currentClass = $derived(current?.sis_classes);
</script>

<DashboardContent title={displayName} subtitle={`Student ${s.student_no ?? '—'} · Admission ${s.admission_no}`}>
  {#snippet headerActions()}
    <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{s.status}</span>
    <Button size="sm" variant="outline" onclick={() => (showEvent = true)}>Record Event</Button>
    <Button size="sm" variant="outline" onclick={() => (showExit = true)}>Record Exit</Button>
  {/snippet}

  <div class="grid gap-4 lg:grid-cols-3">
    <section class="rounded-xl border border-border bg-white p-5 lg:col-span-2">
      <div class="flex items-start justify-between gap-4"><div><h2 class="text-sm font-semibold">Student overview</h2><p class="mt-1 text-xs text-muted-foreground">Core identity and current school placement.</p></div><span class="text-xs text-muted-foreground">{s.admission_date ?? 'Admission date not recorded'}</span></div>
      <div class="mt-5 grid gap-5 sm:grid-cols-3">
        <div><p class="label">Current enrollment</p><p class="value">{currentClass?.name ?? 'Not enrolled'}</p><p class="sub">{currentClass?.stream ? `${currentClass.stream} · ` : ''}{current?.academic_year ?? 'No academic year'}</p></div>
        <div><p class="label">Admission</p><p class="value">{s.admission_no ?? '—'}</p><p class="sub">Student no. {s.student_no ?? '—'}</p></div>
        <div><p class="label">Date of birth</p><p class="value">{s.date_of_birth ?? '—'}</p><p class="sub">{s.gender ?? 'Gender not recorded'} · {s.nationality ?? 'Nationality not recorded'}</p></div>
      </div>
    </section>
    <section class="rounded-xl border border-border bg-white p-5"><h2 class="text-sm font-semibold">Family</h2><p class="mt-1 text-xs text-muted-foreground">Linked guardians and primary contacts.</p><div class="mt-4 space-y-3">{#each data.guardians as g}<div class="rounded-lg border border-border p-3"><p class="text-sm font-medium">{g.parents?.full_name ?? 'Guardian'}</p><p class="mt-1 text-xs text-muted-foreground">{g.relationship ?? 'Guardian'} · {g.parents?.phone ?? 'No phone'}</p>{#if g.parents?.email}<p class="mt-1 text-xs text-muted-foreground">{g.parents.email}</p>{/if}</div>{:else}<p class="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">No guardian linked.</p>{/each}</div></section>
  </div>

  <div class="mt-4 grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-border bg-white p-5"><div class="flex items-center justify-between"><div><h2 class="text-sm font-semibold">Enrollment history</h2><p class="mt-1 text-xs text-muted-foreground">Historical records remain intact across academic years.</p></div><span class="text-xs text-muted-foreground">{data.enrollments.length} record(s)</span></div><div class="mt-4 space-y-3">{#each data.enrollments as e}<div class="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0"><div><p class="text-sm font-medium">{e.sis_classes?.name ?? 'Class'}{e.sis_classes?.stream ? ` · ${e.sis_classes.stream}` : ''}</p><p class="text-xs text-muted-foreground">{e.academic_year ?? '—'} · Enrolled {e.enrolled_at?.slice(0,10) ?? '—'}{e.exited_at ? ` · Exited ${e.exited_at}` : ''}</p></div><span class="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">{e.status}</span></div>{:else}<p class="text-sm text-muted-foreground">No enrollment history.</p>{/each}</div></section>
    <section class="rounded-xl border border-border bg-white p-5"><h2 class="text-sm font-semibold">Lifecycle</h2><p class="mt-1 text-xs text-muted-foreground">Append-only student history and status changes.</p><div class="mt-4 space-y-3">{#each data.events as e}<div class="flex gap-3"><span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"></span><div><p class="text-sm font-medium capitalize">{e.event_type}</p><p class="text-xs text-muted-foreground">{e.effective_on}{e.reason ? ` · ${e.reason}` : ''}</p>{#if e.notes}<p class="mt-1 text-xs text-muted-foreground">{e.notes}</p>{/if}</div></div>{:else}<p class="text-sm text-muted-foreground">No lifecycle events.</p>{/each}</div></section>
  </div>

  <div class="mt-4 grid gap-4 lg:grid-cols-3">
    <section class="rounded-xl border border-border bg-white p-5"><h2 class="text-sm font-semibold">ReClass</h2><p class="mt-1 text-xs text-muted-foreground">Remedial participation linked to this student.</p><div class="mt-4 space-y-2">{#each data.remedial as r}<div class="rounded-lg bg-muted/50 p-3"><p class="text-sm font-medium">{r.remedial_groups?.name ?? 'Remedial group'}</p><p class="text-xs text-muted-foreground">Joined {r.enrolled_at?.slice(0,10) ?? '—'}</p></div>{:else}<p class="text-sm text-muted-foreground">No current remedial participation.</p>{/each}</div></section>
    <section class="rounded-xl border border-border bg-white p-5"><h2 class="text-sm font-semibold">Finance</h2><p class="mt-1 text-xs text-muted-foreground">Student-linked billing records.</p><p class="mt-4 text-2xl font-semibold">{data.invoices.length}</p><p class="text-xs text-muted-foreground">invoice record(s)</p></section>
    <section class="rounded-xl border border-border bg-white p-5"><h2 class="text-sm font-semibold">Documents</h2><p class="mt-1 text-xs text-muted-foreground">Retained student records and verification history.</p><p class="mt-4 text-2xl font-semibold">{data.documents.length}</p><p class="text-xs text-muted-foreground">document record(s)</p></section>
  </div>
</DashboardContent>

{#if showEvent || showExit}
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div class="w-full max-w-md rounded-2xl bg-white shadow-xl"><div class="border-b border-border px-6 py-4"><h2 class="font-semibold">{showExit ? 'Record Student Exit' : 'Record Lifecycle Event'}</h2><p class="text-xs text-muted-foreground">This appends history; it does not erase prior records.</p></div>
<form method="POST" action={showExit ? '?/exit' : '?/event'} use:enhance={submit} class="grid gap-4 px-6 py-5"><label class="space-y-1 text-xs font-medium">Event<select name="event_type" class="field">{#if showExit}<option value="transferred">Transferred</option><option value="withdrawn">Withdrawn</option><option value="expelled">Expelled</option><option value="other">Other Exit</option>{:else}<option value="progressed">Progressed</option><option value="other">Other</option><option value="restored">Restored</option><option value="archived">Archived</option>{/if}</select></label><label class="space-y-1 text-xs font-medium">Effective Date<input name="effective_on" type="date" required class="field" value={new Date().toISOString().slice(0,10)} /></label><label class="space-y-1 text-xs font-medium">Reason<input name="reason" class="field" /></label><label class="space-y-1 text-xs font-medium">Notes<textarea name="notes" rows="3" class="field"></textarea></label><div class="flex justify-end gap-2"><Button type="button" variant="outline" onclick={() => { showEvent = false; showExit = false; }}>Cancel</Button><Button type="submit">Save</Button></div></form></div></div>
{/if}
<style>.label{font-size:.7rem;color:hsl(var(--muted-foreground));text-transform:uppercase;letter-spacing:.04em}.value{margin-top:.25rem;font-size:.95rem;font-weight:600}.sub{margin-top:.1rem;font-size:.72rem;color:hsl(var(--muted-foreground))}:global(.field){width:100%;border:1px solid hsl(var(--border));border-radius:.5rem;padding:.55rem .7rem;font-size:.875rem;outline:none}</style>
