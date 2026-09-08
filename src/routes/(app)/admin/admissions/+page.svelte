<script lang="ts">
  import { UserPlus, Search, ArrowRight, ClipboardCheck } from 'lucide-svelte';
  export let data: any;
  let query = '';
  $: filtered = data.students.filter((s) => `${s.first_name} ${s.last_name} ${s.admission_no ?? ''}`.toLowerCase().includes(query.toLowerCase()));
</script>

<svelte:head><title>Admissions · eShule</title></svelte:head>

<div class="mx-auto max-w-7xl space-y-6 p-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div><p class="text-sm font-medium text-primary">School administration</p><h1 class="text-3xl font-semibold tracking-tight">Admissions & enrollment</h1><p class="mt-1 text-muted-foreground">Move a learner from applicant to enrolled student with a clear operational trail.</p></div>
    <a href="/admin/admissions/new" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><UserPlus size={17}/> New admission</a>
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <div class="rounded-xl border bg-card p-5"><p class="text-sm text-muted-foreground">Recent student records</p><p class="mt-2 text-3xl font-semibold">{data.students.length}</p></div>
    <div class="rounded-xl border bg-card p-5"><p class="text-sm text-muted-foreground">Admissions workflow</p><p class="mt-2 flex items-center gap-2 font-semibold"><ClipboardCheck size={18}/> Admission → enrollment</p></div>
    <div class="rounded-xl border bg-card p-5"><p class="text-sm text-muted-foreground">Next action</p><p class="mt-2 font-semibold">Complete outstanding enrollment records</p></div>
  </div>

  <div class="rounded-xl border bg-card">
    <div class="flex items-center gap-3 border-b p-4"><Search size={18} class="text-muted-foreground"/><input bind:value={query} class="w-full bg-transparent text-sm outline-none" placeholder="Search learner or admission number…"/></div>
    <div class="divide-y">
      {#each filtered as student}
        <a href={`/admin/students/${student.id}`} class="flex items-center justify-between gap-4 p-4 transition hover:bg-muted/40">
          <div><p class="font-medium">{student.first_name} {student.last_name}</p><p class="text-sm text-muted-foreground">{student.admission_no ?? 'No admission number'} · {student.status ?? 'status pending'}</p></div>
          <ArrowRight size={18} class="text-muted-foreground"/>
        </a>
      {:else}<div class="p-10 text-center text-sm text-muted-foreground">No matching learners.</div>{/each}
    </div>
  </div>
</div>
