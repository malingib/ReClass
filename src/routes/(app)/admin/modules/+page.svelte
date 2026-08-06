<script lang="ts">
  import { suiteModules, moduleIcons } from '$lib/modules';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

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

  let mounted = $state(false);
  onMount(() => { requestAnimationFrame(() => { mounted = true; }); });

  // Only modules the super admin has provisioned for this tenant.
  const enabledModules = $derived.by<Set<string> | null>(() => {
    const list = ($page.data as { enabledModules?: string[] | null }).enabledModules;
    return list ? new Set(list) : null; // null = all modules
  });

  const visibleModules = $derived(
    suiteModules.filter(m => m.status === 'available' && (!enabledModules || enabledModules.has(m.id)))
  );
</script>

<div class="mx-auto max-w-5xl py-8">
  <div class="mb-8">
    <h1 class="text-2xl font-semibold text-ink-900">Modules</h1>
    <p class="mt-1 text-sm text-ink-400">Select a module to open its dashboard.</p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#if !mounted}
      {#each Array(6) as _, i}
        <div class="anim-card stagger-{i + 1} overflow-hidden rounded-2xl border border-border/60 bg-white p-6 shadow-card">
          <div class="flex items-start justify-between">
            <div class="h-12 w-12 rounded-xl bg-slate-100 animate-pulse"></div>
            <div class="h-5 w-5 rounded bg-slate-100 animate-pulse"></div>
          </div>
          <div class="mt-4 h-5 w-32 rounded bg-slate-100 animate-pulse"></div>
          <div class="mt-2 h-3 w-full rounded bg-slate-100 animate-pulse"></div>
          <div class="mt-1 h-3 w-3/4 rounded bg-slate-100 animate-pulse"></div>
        </div>
      {/each}
    {:else}
      {#each visibleModules as m, i (m.id)}
        <a href={m.href!}
          class="anim-card stagger-{i + 1} group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hov"
        >
          <div class="flex items-start justify-between">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br {accentGradients[m.accent]} text-white shadow-md">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="{moduleIcons[m.icon]}" />
              </svg>
            </div>
            <svg class="h-5 w-5 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 class="mt-4 text-base font-semibold text-ink-900">{m.name}</h3>
          <p class="mt-1 text-xs text-ink-400">{m.description}</p>
        </a>
      {/each}
    {/if}
  </div>
</div>
