<script lang="ts">
  import '../app.css';

  const { children }: { children: import('svelte').Snippet } = $props();
</script>

{@render children()}
