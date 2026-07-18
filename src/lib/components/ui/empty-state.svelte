<script lang="ts">
  import { cn } from './utils';
  const { message, action, class: className = '' }: {
    message?: string;
    action?: import('svelte').Snippet;
    class?: string;
  } = $props();
</script>

<div class={cn('overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm', className)}>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
      </svg>
    </div>
    <p class="text-sm text-ink-500">{message || 'No data yet'}</p>
    {#if action}
      {@render action()}
    {/if}
  </div>
</div>
