<script lang="ts">
  const {
    loading = false,
    disabled = false,
    variant = 'primary',
    children,
    ...rest
  }: {
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'danger' | 'ghost';
    children?: import('svelte').Snippet;
  } = $props();
</script>

<button
  {...rest}
  disabled={disabled || loading}
  class={[
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'primary' ? 'bg-brand-600 text-white hover:bg-brand-700' : '',
    variant === 'danger' ? 'bg-danger text-white hover:bg-danger/90' : '',
    variant === 'ghost' ? 'border border-border text-ink-600 hover:bg-ink-50' : '',
  ].join(' ')}
>
  {#if loading}
    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  {/if}
  {@render children?.()}
</button>
