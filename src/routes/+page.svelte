<script lang="ts">
  import { goto } from '$app/navigation';
  import { suiteModules, moduleIcons } from '$lib/modules';

  const accentGradients: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    orange: 'from-orange-500 to-orange-600',
    slate: 'from-slate-500 to-slate-600',
  };

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
      <h1 class="mt-5 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">Choose a module</h1>
      <p class="mx-auto mt-3 max-w-lg text-sm text-ink-400">eShule is a modular school management platform. Select a module to get started, or sign in to access your dashboard.</p>
    </div>

    <div class="mt-12 grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each suiteModules as m (m.id)}
        {#if m.status === 'available'}
          <a href="/login"
            class="group relative overflow-hidden rounded-2xl border border-ink-200/60 bg-white/80 p-6 shadow-[0_4px_20px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-ink-300 hover:shadow-[0_12px_40px_rgba(15,23,42,0.1)]"
          >
            <div class="flex items-start justify-between">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br {accentGradients[m.accent]} text-white shadow-md">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="{moduleIcons[m.icon]}" />
                </svg>
              </div>
              <svg class="h-5 w-5 text-ink-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-ink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold text-ink-900">{m.name}</h3>
            <p class="mt-1 text-xs text-ink-400">{m.description}</p>
          </a>
        {:else}
          <div class="relative overflow-hidden rounded-2xl border border-ink-200/40 bg-white/50 p-6 opacity-50">
            <div class="flex items-start justify-between">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br {accentGradients[m.accent]} text-xl text-white shadow-md opacity-60">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="{moduleIcons[m.icon]}" />
                </svg>
              </div>
            </div>
            <h3 class="mt-4 text-base font-semibold text-ink-500">{m.name}</h3>
            <p class="mt-1 text-xs text-ink-300">{m.description}</p>
            <span class="mt-2 inline-block rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Coming soon</span>
          </div>
        {/if}
      {/each}
    </div>

    <p class="mt-10 text-xs text-ink-300">
      Already have an account?
      <a href="/login" class="font-medium text-brand-600 hover:text-brand-700">Sign in</a>
    </p>
  </main>

  <footer class="border-t border-ink-100 px-6 py-4 text-center text-xs text-ink-300 sm:px-10">
    &copy; {new Date().getFullYear()} eShule &mdash; Mobiwave Innovations Ltd
  </footer>
</div>
