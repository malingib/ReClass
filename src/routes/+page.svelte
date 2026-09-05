<script lang="ts">
  import { goto } from '$app/navigation';
  import { ArrowRight, Banknote, BookOpen, CheckCircle2, MessageSquare, ShieldCheck, Users } from 'lucide-svelte';

  function goLogin() { goto('/login'); }
</script>

<svelte:head>
  <title>eShule — School Management Platform</title>
  <meta name="description" content="eShule brings school administration, teaching, finance, ReClass remedial operations and family communication into one secure platform." />
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900">
  <header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur sm:px-8">
    <div class="mx-auto flex max-w-6xl items-center justify-between">
      <a href="/" class="flex items-center gap-3" aria-label="eShule home"><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">e</span><span class="text-lg font-semibold">eShule</span></a>
      <button onclick={goLogin} class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Sign in</button>
    </div>
  </header>

  <main>
    <section class="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
      <div class="max-w-3xl">
        <span class="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">School operations platform</span>
        <h1 class="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">One school view.<br /><span class="text-primary">Every role moving together.</span></h1>
        <p class="mt-6 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">eShule connects administrators, teachers, bursars, remedial teams and families around the work that matters every day — students, learning, attendance, fees and communication.</p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row"><button onclick={goLogin} class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">Sign in to eShule <ArrowRight class="h-4 w-4" /></button><a href="#roles" class="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50">See how it works</a></div>
      </div>

      <div class="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Users class="h-5 w-5 text-primary" /><h2 class="mt-4 text-sm font-semibold">Students & families</h2><p class="mt-2 text-xs leading-5 text-slate-500">Keep learner records, family access and fee information connected.</p></div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><BookOpen class="h-5 w-5 text-primary" /><h2 class="mt-4 text-sm font-semibold">Teaching & attendance</h2><p class="mt-2 text-xs leading-5 text-slate-500">Give teachers a focused daily workspace for classes and delivery.</p></div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Banknote class="h-5 w-5 text-primary" /><h2 class="mt-4 text-sm font-semibold">Finance</h2><p class="mt-2 text-xs leading-5 text-slate-500">Let the Bursar own school collections, reconciliation and receipts.</p></div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><MessageSquare class="h-5 w-5 text-primary" /><h2 class="mt-4 text-sm font-semibold">Communication</h2><p class="mt-2 text-xs leading-5 text-slate-500">Keep staff and families informed through one shared channel.</p></div>
      </div>
    </section>

    <section id="roles" class="border-y border-slate-200 bg-white">
      <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div class="max-w-2xl"><p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">Role-first experience</p><h2 class="mt-2 text-3xl font-bold tracking-tight">The right work for the right person.</h2><p class="mt-3 text-sm leading-6 text-slate-500">Users don't need to understand the whole system. eShule puts their responsibilities and next actions first.</p></div>
        <div class="mt-10 grid gap-4 md:grid-cols-2">
          {#each [
            ['School administrator', 'Run school operations, staff access, students, communication and specialist workspaces.'],
            ['Teacher', 'Start with today's sessions, attendance and the classes or remedial responsibilities assigned to you.'],
            ['Bursar', 'Own school-finance collections, reconciliation and payment evidence without mixing in remedial operations.'],
            ['Parent', 'See your children, outstanding balances, payments and school announcements — then pay when needed.']
          ] as role}
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div class="flex items-start gap-3"><CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h3 class="text-sm font-semibold">{role[0]}</h3><p class="mt-1 text-sm leading-6 text-slate-500">{role[1]}</p></div></div></div>
          {/each}
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <div class="grid gap-5 lg:grid-cols-3">
        <div class="rounded-3xl border border-primary/15 bg-primary/5 p-7"><ShieldCheck class="h-6 w-6 text-primary" /><h2 class="mt-5 text-lg font-semibold">Secure by role</h2><p class="mt-2 text-sm leading-6 text-slate-500">Each user sees only the school information and actions their responsibilities allow.</p></div>
        <div class="rounded-3xl border border-slate-200 bg-white p-7"><Banknote class="h-6 w-6 text-primary" /><h2 class="mt-5 text-lg font-semibold">Built for local payments</h2><p class="mt-2 text-sm leading-6 text-slate-500">Families can follow school payment instructions and use M-Pesa where enabled by the school.</p></div>
        <div class="rounded-3xl border border-slate-200 bg-white p-7"><BookOpen class="h-6 w-6 text-primary" /><h2 class="mt-5 text-lg font-semibold">ReClass inside eShule</h2><p class="mt-2 text-sm leading-6 text-slate-500">Targeted remedial learning is a first-class programme while remaining separate from school-finance ownership.</p></div>
      </div>
    </section>

    <section class="bg-slate-900 px-5 py-16 text-white sm:px-8"><div class="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Ready to work</p><h2 class="mt-2 text-3xl font-bold">Start with today's work.</h2><p class="mt-2 max-w-xl text-sm leading-6 text-slate-300">eShule keeps specialist tools available without making every user navigate the whole platform.</p></div><button onclick={goLogin} class="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-slate-900 hover:bg-slate-100">Sign in <ArrowRight class="h-4 w-4" /></button></div></section>
  </main>

  <footer class="border-t border-slate-200 bg-white px-5 py-6 text-center text-xs text-slate-400 sm:px-8">&copy; {new Date().getFullYear()} eShule — Mobiwave Innovations Ltd</footer>
</div>
