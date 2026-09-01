<script lang="ts">
  const { data } = $props();
  const work = [
    { title: 'Students', description: 'Add students, review records and manage enrolment.', href: '/admin/students', icon: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zm-10 9a6 6 0 0112 0' },
    { title: 'Fees & finance', description: 'Track income, expenses, receipts and balances.', href: '/admin/finance', icon: 'M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z' },
    { title: 'Communications', description: 'Send announcements and keep families informed.', href: '/admin/communications', icon: 'M4 6h16M4 12h16M4 18h10' },
    { title: 'Remedial programme', description: 'Open ReClass for targeted learning, sessions and attendance.', href: '/admin/reclass', icon: 'M4 19h16M6 16V5h12v11M9 9h6M9 12h4' },
  ];
  const actions = [
    { label: 'Add student', href: '/admin/students', hint: 'Create a student record' },
    { label: 'Record income', href: '/admin/finance/income', hint: 'Capture a payment or income item' },
    { label: 'Send announcement', href: '/admin/communications/announcements', hint: 'Notify staff and families' },
    { label: 'Open ReClass', href: '/admin/reclass', hint: 'Manage remedial delivery' },
  ];
  const setup = [
    { title: 'Set up students and classes', href: '/admin/students', detail: 'Load your active student records and class structure.' },
    { title: 'Configure fees and payment channels', href: '/admin/fees', detail: 'Make balances and payment instructions ready for families.' },
    { title: 'Invite or assign staff', href: '/admin/users', detail: 'Give teachers, bursars and leaders the right access.' },
    { title: 'Publish your first announcement', href: '/admin/communications/announcements', detail: 'Keep families and staff informed from day one.' },
  ];
</script>

<svelte:head><title>School operations · eShule</title><meta name="description" content="eShule school operations workspace for daily administration, students, finance, communications and programmes." /></svelte:head>

<div class="mx-auto max-w-6xl space-y-8 py-6 sm:py-8">
  <section class="rounded-3xl border border-border/60 bg-white p-6 shadow-card sm:p-8"><div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div class="max-w-2xl"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">School operations</p><h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Run the school from one place.</h1><p class="mt-3 max-w-xl text-sm leading-6 text-ink-500 sm:text-base">Start with today's work, then open the specialist area you need. eShule is the complete school operations platform; ReClass is the remedial programme within it.</p></div><a href="/admin/modules" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-ink-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">View all modules</a></div></section>

  <section aria-labelledby="setup-title" class="rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:p-6"><div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Getting started</p><h2 id="setup-title" class="mt-1 text-lg font-bold text-ink-900">Set up your school in four steps</h2><p class="mt-1 text-sm text-ink-500">Complete these foundations before handing the platform over to daily operations.</p></div><span class="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary shadow-sm">4 steps</span></div><div class="mt-5 grid gap-3 sm:grid-cols-2">{#each setup as item, i}<a href={item.href} class="group rounded-xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"><div class="flex gap-3"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">{i + 1}</span><span><span class="block text-sm font-semibold text-ink-900 group-hover:text-primary">{item.title}</span><span class="mt-1 block text-xs leading-5 text-ink-400">{item.detail}</span></span></div></a>{/each}</div></section>

  <section aria-labelledby="quick-actions-title"><div class="mb-4"><h2 id="quick-actions-title" class="text-lg font-semibold text-ink-900">Quick actions</h2><p class="mt-1 text-sm text-ink-400">Common tasks without navigating through modules.</p></div><div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{#each actions as action}<a href={action.href} class="group rounded-2xl border border-border/60 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"><span class="text-sm font-semibold text-ink-900 group-hover:text-primary">{action.label}</span><span class="mt-1 block text-xs leading-5 text-ink-400">{action.hint}</span></a>{/each}</div></section>

  <section aria-labelledby="work-areas-title"><div class="mb-4"><h2 id="work-areas-title" class="text-lg font-semibold text-ink-900">Work areas</h2><p class="mt-1 text-sm text-ink-400">Choose the area that matches the work you are doing.</p></div><div class="grid gap-4 sm:grid-cols-2">{#each work as item}<a href={item.href} class="group flex gap-4 rounded-2xl border border-border/60 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-primary transition group-hover:bg-primary group-hover:text-white" aria-hidden="true"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d={item.icon} /></svg></span><span class="min-w-0 flex-1"><span class="flex items-center justify-between gap-3"><span class="text-base font-semibold text-ink-900">{item.title}</span><span class="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true">→</span></span><span class="mt-1 block text-sm leading-5 text-ink-400">{item.description}</span></span></a>{/each}</div></section>

  <section class="rounded-2xl border border-dashed border-border bg-slate-50/70 p-5 text-sm text-ink-500"><div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><span class="font-semibold text-ink-700">Need specialist tools?</span> The full module hub remains available whenever you need it.</div><a href="/admin/modules" class="font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary">Open module hub →</a></div></section>
</div>
