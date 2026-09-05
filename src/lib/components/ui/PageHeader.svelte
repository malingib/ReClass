<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    eyebrow = '',
    title,
    description = '',
    actions,
  }: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: Snippet;
  } = $props();
</script>

<header class="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
  <div class="min-w-0">
    {#if eyebrow}
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
    {/if}
    <h1 class="mt-1 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
    {#if description}
      <p class="mt-2 max-w-2xl text-sm leading-6 text-ink-500">{description}</p>
    {/if}
  </div>
  {#if actions}
    <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
      {@render actions()}
    </div>
  {/if}
</header>
