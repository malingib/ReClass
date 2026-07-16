<script lang="ts">
  /**
   * ErrorBoundary — catches runtime errors in its child content
   * and displays a user-friendly fallback with a retry button.
   */
  let {
    children,
    fallbackTitle = 'Something went wrong',
    fallbackMessage = 'An unexpected error occurred while rendering this section.',
  }: {
    children?: import('svelte').Snippet;
    fallbackTitle?: string;
    fallbackMessage?: string;
  } = $props();

  let error = $state<Error | null>(null);
  let id = $state(0);

  $effect(() => {
    const errorHandler = (e: ErrorEvent) => {
      // Only catch errors from within this boundary's subtree
      const target = e.target as HTMLElement | null;
      if (target && target.closest?.('[data-error-boundary]')) {
        e.preventDefault();
        error = e.error ?? new Error(e.message ?? 'Unknown error');
      }
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  });

  function retry() {
    error = null;
    id += 1;
    // Force re-render by toggling key
  }
</script>

{#if error}
  <div
    data-error-boundary
    class="rounded-xl border border-danger/20 bg-danger/5 p-6 text-center"
  >
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
      <svg class="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    </div>
    <h3 class="mt-3 text-sm font-semibold text-ink-900">{fallbackTitle}</h3>
    <p class="mt-1 text-sm text-ink-500">{fallbackMessage}</p>
    {#if error.message}
      <p class="mt-2 text-xs text-ink-400 italic">{error.message}</p>
    {/if}
    <button
      onclick={retry}
      class="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-btn transition-colors hover:bg-brand-700"
    >
      Try again
    </button>
  </div>
{:else}
  <div data-error-boundary data-key={id}>
    {@render children?.()}
  </div>
{/if}
