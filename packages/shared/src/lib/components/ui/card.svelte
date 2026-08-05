<script lang="ts">
  import { cn } from './utils';
  const { class: className = '', children }: {
    class?: string;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<div class={cn('rounded-xl border border-border bg-white shadow-card', className)}>
  {@render children?.()}
</div>
