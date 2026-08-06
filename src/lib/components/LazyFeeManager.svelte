<script lang="ts">
  import { onMount } from 'svelte';

  const props = $props<{
    title: string;
    subtitle: string;
    emptyMessage: string;
    fees: { id: string; name: string; amount: number; due_date: string | null; term: string | null }[];
  }>();

  let loaded = $state(false);
  let FeeManager = $state<any>(null);

  onMount(() => {
    import('./FeeManager.svelte').then(mod => {
      FeeManager = mod.default;
      loaded = true;
    });
  });
</script>

{#if loaded && FeeManager}
  <FeeManager {...props} />
{:else}
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <div class="h-7 w-48 rounded bg-slate-100 animate-pulse"></div>
        <div class="mt-1 h-4 w-64 rounded bg-slate-100 animate-pulse"></div>
      </div>
      <div class="h-9 w-24 rounded-md bg-slate-100 animate-pulse"></div>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white">
      {#each Array(5) as _}
        <div class="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
          <div class="h-4 w-32 rounded bg-slate-100 animate-pulse"></div>
          <div class="h-4 w-20 rounded bg-slate-100 animate-pulse"></div>
          <div class="h-4 w-24 rounded bg-slate-100 animate-pulse"></div>
        </div>
      {/each}
    </div>
  </div>
{/if}
