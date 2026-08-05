<script lang="ts">
  import { goto } from '$app/navigation';

  function goLogin() { goto('/login'); }
</script>

<svelte:head>
  <title>eShule — School Management Platform</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gradient-to-br from-stone-50 via-white to-stone-100/80">
  <header class="flex items-center justify-between px-6 py-4 sm:px-10">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,197,115,0.28)]">e</div>
      <span class="text-lg font-semibold text-ink-900">eShule</span>
    </div>
    <button onclick={goLogin} class="rounded-xl border border-ink-200 bg-white px-5 py-2 text-sm font-medium text-ink-700 shadow-sm transition-all hover:border-ink-300 hover:shadow-md">
      Sign in
    </button>
  </header>

  <main class="flex flex-1 flex-col items-center justify-center px-4 py-16">
    <div class="text-center">
      <span class="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-700">Multi-module platform</span>
      <h1 class="mt-5 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">School management, all in one place</h1>
      <p class="mx-auto mt-3 max-w-lg text-sm text-ink-400">eShule brings your school team, learners, families, records, attendance, schedules, and reports together in one secure platform.</p>
    </div>

    <div class="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-ink-200/60 bg-white/80 p-5 text-center shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
        <h2 class="text-sm font-semibold text-ink-900">One school view</h2>
        <p class="mt-2 text-xs leading-5 text-ink-400">Keep teams, learners, and families working from the same information.</p>
      </div>
      <div class="rounded-2xl border border-ink-200/60 bg-white/80 p-5 text-center shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
        <h2 class="text-sm font-semibold text-ink-900">Simple daily work</h2>
        <p class="mt-2 text-xs leading-5 text-ink-400">Manage classes, schedules, attendance, and records without scattered tools.</p>
      </div>
      <div class="rounded-2xl border border-ink-200/60 bg-white/80 p-5 text-center shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
        <h2 class="text-sm font-semibold text-ink-900">Secure access</h2>
        <p class="mt-2 text-xs leading-5 text-ink-400">Each user sees the school information and tools relevant to their role.</p>
      </div>
    </div>

    <button onclick={goLogin} class="mt-10 rounded-xl bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-btn transition hover:bg-brand-600">
      Sign in to eShule
    </button>

    <p class="mt-10 text-xs text-ink-300">
      Already have an account?
      <a href="/login" class="font-medium text-brand-600 hover:text-brand-700">Sign in</a>
    </p>
  </main>

  <footer class="border-t border-ink-100 px-6 py-4 text-center text-xs text-ink-300 sm:px-10">
    &copy; {new Date().getFullYear()} eShule &mdash; Mobiwave Innovations Ltd
  </footer>
</div>
