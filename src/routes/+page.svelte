<script lang="ts">
  import { suiteModules } from '$lib/modules';
  import ModuleLauncher from '$lib/components/ModuleLauncher.svelte';
  import { goto } from '$app/navigation';

  function goLogin() { goto('/login'); }
</script>

<svelte:head>
  <title>ReClass — Remedial Classes Management</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(0,197,115,0.18),_transparent_24%),linear-gradient(135deg,_#f4f7fb_0%,_#f8fbff_100%)]">
  <header class="flex items-center justify-between px-6 py-4 sm:px-10">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,197,115,0.28)]">R</div>
      <span class="text-lg font-semibold text-ink-900">ReClass</span>
    </div>
    <button onclick={goLogin} class="rounded-xl border border-ink-200 bg-white px-5 py-2 text-sm font-medium text-ink-700 shadow-sm transition-all hover:border-ink-300 hover:shadow-md">
      Sign in
    </button>
  </header>

  <main class="flex flex-1 flex-col items-center px-4 py-16">
    <div class="text-center">
      <span class="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-700">ReClass suite</span>
      <h1 class="mt-5 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">All your school operations in one place</h1>
      <p class="mx-auto mt-3 max-w-lg text-sm text-ink-400">Select a module to manage remedial classes, student records, attendance, fees, and more.</p>
    </div>

    <div class="mt-12 w-full max-w-5xl">
      <ModuleLauncher modules={suiteModules} />
    </div>

    <p class="mt-12 text-xs text-ink-300">
      Already have an account?
      <a href="/login" class="font-medium text-brand-600 hover:text-brand-700">Sign in</a>
    </p>
  </main>

  <footer class="border-t border-ink-100 px-6 py-4 text-center text-xs text-ink-300 sm:px-10">
    &copy; {new Date().getFullYear()} ReClass &mdash; Mobiwave Innovations Ltd
  </footer>
</div>
