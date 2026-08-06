<script lang="ts">
  import { goto } from '$app/navigation';

  function goLogin() { goto('/login'); }
</script>

<svelte:head>
  <title>eShule — School Management Platform</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-slate-50">
  <header class="flex items-center justify-between px-6 py-4 sm:px-10">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">e</div>
      <span class="text-lg font-semibold text-slate-900">eShule</span>
    </div>
    <button onclick={goLogin} class="rounded-md border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
      Sign in
    </button>
  </header>

  <main class="flex flex-1 flex-col items-center justify-center px-4 py-16">
    <div class="text-center">
      <span class="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Multi-module platform</span>
      <h1 class="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">School management, all in one place</h1>
      <p class="mx-auto mt-3 max-w-lg text-sm text-slate-500">eShule brings your school team, learners, families, records, attendance, schedules, and reports together in one secure platform.</p>
    </div>

    <div class="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
      <div class="rounded-lg border border-slate-200 bg-white p-5 text-center">
        <h2 class="text-sm font-semibold text-slate-900">One school view</h2>
        <p class="mt-2 text-xs leading-5 text-slate-500">Keep teams, learners, and families working from the same information.</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-5 text-center">
        <h2 class="text-sm font-semibold text-slate-900">Simple daily work</h2>
        <p class="mt-2 text-xs leading-5 text-slate-500">Manage classes, schedules, attendance, and records without scattered tools.</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-5 text-center">
        <h2 class="text-sm font-semibold text-slate-900">Secure access</h2>
        <p class="mt-2 text-xs leading-5 text-slate-500">Each user sees the school information and tools relevant to their role.</p>
      </div>
    </div>

    <button onclick={goLogin} class="mt-10 rounded-md bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
      Sign in to eShule
    </button>

    <p class="mt-10 text-xs text-slate-400">
      Already have an account?
      <a href="/login" class="font-medium text-primary hover:text-primary/80">Sign in</a>
    </p>
  </main>

  <footer class="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400 sm:px-10">
    &copy; {new Date().getFullYear()} eShule &mdash; Mobiwave Innovations Ltd
  </footer>
</div>
