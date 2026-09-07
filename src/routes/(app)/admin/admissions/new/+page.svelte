<svelte:head><title>New admission · eShule</title></svelte:head>

<div class="mx-auto max-w-3xl p-6">
  <a href="/admin/admissions" class="text-sm text-muted-foreground hover:text-foreground">← Admissions</a>
  <div class="mt-6 rounded-xl border bg-card p-6">
    <p class="text-sm font-medium text-primary">Enrollment intake</p>
    <h1 class="mt-1 text-2xl font-semibold">New admission</h1>
    <p class="mt-2 text-sm text-muted-foreground">Capture the learner record first, then complete class and guardian enrollment from the student workspace.</p>
    <div class="mt-8 grid gap-5 sm:grid-cols-2">
      <label class="space-y-2 text-sm font-medium">First name<input class="w-full rounded-lg border bg-background px-3 py-2" placeholder="First name" /></label>
      <label class="space-y-2 text-sm font-medium">Last name<input class="w-full rounded-lg border bg-background px-3 py-2" placeholder="Last name" /></label>
      <label class="space-y-2 text-sm font-medium">Admission number<input class="w-full rounded-lg border bg-background px-3 py-2" placeholder="Assigned by school" /></label>
      <label class="space-y-2 text-sm font-medium">Entry class<input class="w-full rounded-lg border bg-background px-3 py-2" placeholder="e.g. Form 1" /></label>
    </div>
    <div class="mt-8 flex justify-end"><button type="button" class="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Save admission</button></div>
  </div>
</div>
