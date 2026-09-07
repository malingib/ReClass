<script lang="ts">
  import { ArrowLeft, CircleDot, UserRound } from 'lucide-svelte';
  const { data } = $props();
</script>

<svelte:head><title>{data.student ? `${data.student.first_name} ${data.student.last_name}` : 'Student'} · eShule</title></svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-6">
  <a href="/admin/admissions" class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/> Admissions</a>
  {#if data.student}
    <section class="rounded-2xl border bg-card p-6 sm:p-8"><div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center gap-4"><div class="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><UserRound size={22}/></div><div><p class="text-sm text-muted-foreground">Student record</p><h1 class="text-2xl font-semibold">{data.student.first_name} {data.student.last_name}</h1><p class="text-sm text-muted-foreground">{data.student.admission_number ?? 'No admission number'} · {data.student.status ?? 'Status pending'}</p></div></div><span class="rounded-full bg-muted px-3 py-1 text-xs font-medium">Lifecycle tracked</span></div></section>
    <section class="rounded-2xl border bg-card"><div class="border-b p-5"><h2 class="font-semibold">Student lifecycle</h2><p class="mt-1 text-sm text-muted-foreground">Admissions, enrollment and movement history remain attached to the learner.</p></div><div class="divide-y">{#each data.events as event}<article class="flex gap-4 p-5"><div class="mt-1 text-primary"><CircleDot size={16}/></div><div><p class="font-medium">{event.event_type}</p><p class="text-sm text-muted-foreground">{event.event_date}</p>{#if event.notes}<p class="mt-2 text-sm leading-6">{event.notes}</p>{/if}</div></article>{:else}<div class="p-10 text-center text-sm text-muted-foreground">No lifecycle events have been recorded yet.</div>{/each}</div></section>
  {:else}<div class="rounded-xl border bg-card p-10 text-center"><h1 class="font-semibold">Student not found</h1><p class="mt-2 text-sm text-muted-foreground">{data.error ?? 'The requested student record is unavailable.'}</p></div>{/if}
</div>
