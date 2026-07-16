<script lang="ts">
  import { suiteModules } from '$lib/modules';
  import ModuleLauncher from '$lib/components/ModuleLauncher.svelte';

  let { data } = $props();
  let fullName = $derived(data.fullName ?? 'Admin');
</script>

<svelte:head>
  <title>Admin — ReClass</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
  <div class="mb-8">
    <span class="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-700">Admin</span>
    <h1 class="mt-3 text-3xl font-bold tracking-tight text-ink-900">Welcome, {fullName}</h1>
    <p class="mt-1 text-sm text-ink-400">Select a module to get started</p>
  </div>

  <ModuleLauncher modules={suiteModules} />
</div>
