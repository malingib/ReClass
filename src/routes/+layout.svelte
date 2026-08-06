<script lang="ts">
  import '../app.css';
  import { onNavigate } from '$app/navigation';

  const { children }: { children: import('svelte').Snippet } = $props();

  // Enable View Transitions API for page navigation
  onNavigate((navigation) => {
    if (!(document as any).startViewTransition) return;

    return new Promise((resolve) => {
      (document as any).startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

{@render children()}
