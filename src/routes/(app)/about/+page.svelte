<svelte:head>
  <title>About · eShule</title>
  <meta
    name="description"
    content="eShule is a school operations platform connecting administration, teaching, finance, payroll, communication, governance and programme workflows."
  />
</svelte:head>

<div class="space-y-10">
  <header class="max-w-4xl space-y-4">
    <div class="inline-flex items-center rounded-full border bg-muted/40 px-3 py-1 text-sm font-medium text-muted-foreground">
      About eShule
    </div>
    <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
      One operating platform for the whole school.
    </h1>
    <p class="max-w-3xl text-lg leading-8 text-muted-foreground">
      eShule brings the people, records, workflows and evidence needed to run a school into one accountable environment — from daily teaching and student administration to finance, payroll, communication and governance.
    </p>
  </header>

  <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Platform overview">
    <article class="rounded-2xl border bg-card p-7 shadow-sm">
      <p class="text-sm font-medium text-muted-foreground">The platform</p>
      <h2 class="mt-2 text-2xl font-semibold">Built around how schools actually operate</h2>
      <p class="mt-4 leading-7 text-muted-foreground">
        eShule is designed as a modular school-management platform. Each workspace is shaped by the user's role, responsibilities and rights, so people see the work they are accountable for instead of a one-size-fits-all dashboard.
      </p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border bg-muted/20 p-4">
          <p class="font-medium">School administration</p>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">Students, guardians, teachers, classes, schedules, records and operational reporting.</p>
        </div>
        <div class="rounded-xl border bg-muted/20 p-4">
          <p class="font-medium">Teaching & learning</p>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">Teacher workspaces, attendance, academic workflows and classroom responsibilities.</p>
        </div>
        <div class="rounded-xl border bg-muted/20 p-4">
          <p class="font-medium">Finance & payroll</p>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">School finance, payment evidence and teacher compensation remain distinct but connected.</p>
        </div>
        <div class="rounded-xl border bg-muted/20 p-4">
          <p class="font-medium">Communication & governance</p>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">Notifications, messaging, approvals and audit evidence support accountable operations.</p>
        </div>
      </div>
    </article>

    <article class="rounded-2xl border bg-card p-7 shadow-sm">
      <p class="text-sm font-medium text-muted-foreground">ReClass module</p>
      <h2 class="mt-2 text-2xl font-semibold">Remedial operations, inside eShule</h2>
      <p class="mt-4 leading-7 text-muted-foreground">
        ReClass is eShule's remedial learning and programme-management module. It provides the workflows for remedial sessions, attendance, committee responsibilities and programme operations while respecting the school's wider financial and payroll boundaries.
      </p>
      <div class="mt-6 rounded-xl border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
        ReClass does not replace school finance or teacher payroll. It owns the remedial programme; the appropriate school functions own money, compensation and payment evidence.
      </div>
    </article>
  </section>

  <section class="rounded-2xl border bg-card p-7 shadow-sm">
    <div class="max-w-3xl">
      <p class="text-sm font-medium text-muted-foreground">Accountability by design</p>
      <h2 class="mt-2 text-2xl font-semibold">Clear ownership. Clear rights. Clear evidence.</h2>
      <p class="mt-3 leading-7 text-muted-foreground">
        A user's base role, committee assignment, responsibilities and rights determine the work surfaced in the interface. Server-side authorization and database controls independently enforce what can actually be done.
      </p>
    </div>

    <div class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-xl border p-5">
        <h3 class="font-semibold">Bursar</h3>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">Owns school finance, receivables and financial operations.</p>
      </div>
      <div class="rounded-xl border p-5">
        <h3 class="font-semibold">ReClass</h3>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">Owns remedial programme operations and committee workflows.</p>
      </div>
      <div class="rounded-xl border p-5">
        <h3 class="font-semibold">Payroll</h3>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">Owns teacher compensation, allowances and role-specific payments.</p>
      </div>
      <div class="rounded-xl border p-5">
        <h3 class="font-semibold">Receipts</h3>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">Document successful payments as evidence of what was actually paid.</p>
      </div>
      <div class="rounded-xl border p-5">
        <h3 class="font-semibold">Notifications</h3>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">Provide shared event, delivery and communication services across modules.</p>
      </div>
      <div class="rounded-xl border p-5">
        <h3 class="font-semibold">Audit</h3>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">Preserves accountability around important actions, approvals and changes.</p>
      </div>
    </div>
  </section>

  <section class="rounded-2xl border bg-muted/20 p-7">
    <h2 class="text-xl font-semibold">The eShule principle</h2>
    <p class="mt-3 text-sm leading-7 text-muted-foreground">
      User → Base role → Committee assignment → Responsibilities → Rights → Derived navigation, dashboards and actions.
    </p>
    <p class="mt-3 text-sm leading-7 text-muted-foreground">
      The interface helps people understand their responsibilities; authorization remains the security boundary.
    </p>
  </section>
</div>
