<script lang="ts">
  import { cn } from './utils';
  const { title, subtitle, action, class: className = '' }: {
    title: string;
    subtitle?: string;
    action?: import('svelte').Snippet;
    class?: string;
  } = $props();
</script>

<div class={cn('flex items-center justify-between border-b border-slate-100 px-6 py-5', className)}>
  <div class="min-w-0">
    <h3 class="text-sm font-semibold text-slate-900">{title}</h3>
    {#if subtitle}
      <p class="mt-0.5 text-xs text-slate-400">{subtitle}</p>
    {/if}
  </div>
  {#if action}
    {@render action()}
  {/if}
</div>
