<script lang="ts">
  import { suiteModules } from '$lib/modules';
  import ModuleLauncher from '$lib/components/ModuleLauncher.svelte';
</script>

<main class="min-h-screen bg-slate-50 text-ink-700">
  <header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">R</div>
        <div class="min-w-0 leading-tight">
          <p class="truncate text-sm font-semibold text-ink-900">ReClass</p>
          <p class="truncate text-xs text-ink-500">School management suite</p>
        </div>
      </div>
      <div class="hidden items-center gap-2 text-sm text-ink-500 sm:flex">
        <svg class="h-4 w-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-4.35 7-11V5l-7-3-7 3v5c0 6.65 7 11 7 11Z" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <span>Secure school workspace</span>
      </div>
    </div>
  </header>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
    <ModuleLauncher modules={suiteModules} />
  </div>
</main>
