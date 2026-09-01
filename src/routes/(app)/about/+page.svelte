<svelte:head>
  <title>About · eShule</title>
  <meta
    name="description"
    content="eShule brings school administration, finance, teaching, payroll, communication, governance and programme workflows into one accountable operating environment."
  />
</svelte:head>

<div class="space-y-8">
  <header class="max-w-3xl space-y-3">
    <p class="text-sm font-medium text-muted-foreground">About eShule</p>
    <h1 class="text-3xl font-semibold tracking-tight">A complete platform for running school operations</h1>
    <p class="text-base leading-7 text-muted-foreground">
      eShule brings school administration, finance, teaching, payroll, communication, governance and programme workflows into one accountable operating environment.
    </p>
  </header>

  <section class="grid gap-6 lg:grid-cols-2">
    <article class="rounded-xl border bg-card p-6 shadow-sm">
      <h2 class="text-xl font-semibold">ReClass</h2>
      <p class="mt-3 leading-7 text-muted-foreground">
        ReClass is the remedial learning and programme-management module within eShule. It manages remedial sessions, attendance, committee governance and related programme workflows without replacing school core finance or payroll ownership.
      </p>
    </article>

    <article class="rounded-xl border bg-card p-6 shadow-sm">
      <h2 class="text-xl font-semibold">Clear responsibilities</h2>
      <p class="mt-3 leading-7 text-muted-foreground">
        Each operational area has a clear owner. Rights determine what a user can see and do, while server-side authorization remains the source of truth.
      </p>
      <ul class="mt-4 space-y-2 text-sm text-muted-foreground">
        <li><strong class="text-foreground">Bursar:</strong> owns school finance.</li>
        <li><strong class="text-foreground">ReClass:</strong> owns remedial operations.</li>
        <li><strong class="text-foreground">Payroll:</strong> owns teacher compensation.</li>
        <li><strong class="text-foreground">Receipts:</strong> document actual payments.</li>
        <li><strong class="text-foreground">Notifications & audit:</strong> shared services across the platform.</li>
      </ul>
    </article>
  </section>

  <section class="rounded-xl border bg-card p-6 shadow-sm">
    <h2 class="text-xl font-semibold">How the platform is organized</h2>
    <ul class="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
      <li>Teaching and classroom operations follow each teacher's assigned scope.</li>
      <li>Remedial programme and committee workflows stay within ReClass.</li>
      <li>School finance and payment evidence remain under the Bursar's responsibility.</li>
      <li>Teacher compensation, allowances and role-specific payments are handled through Payroll.</li>
      <li>Receipts and audit records provide evidence of what actually happened.</li>
      <li>Notifications and communication support the platform as shared services.</li>
    </ul>
  </section>
</div>
