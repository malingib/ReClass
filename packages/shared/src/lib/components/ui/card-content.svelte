<script lang="ts">
  import { cn } from './utils';
  const { class: className = '', children }: {
    class?: string;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<div class={cn('px-6 py-5', className)}>
  {@render children?.()}
</div>
