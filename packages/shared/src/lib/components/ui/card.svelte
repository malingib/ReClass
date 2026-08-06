<script lang="ts">
  import { cn } from './utils';
  const { class: className = '', children }: {
    class?: string;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<div class={cn('rounded-lg border border-slate-200 bg-white', className)}>
  {@render children?.()}
</div>
