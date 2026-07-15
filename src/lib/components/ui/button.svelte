<script lang="ts">
  import { cn } from './utils';
  let { variant = 'primary', size = 'md', loading = false, disabled = false, class: className = '', children }: {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    class?: string;
    children?: import('svelte').Snippet;
  } = $props();

  const variants = {
    primary: 'rounded-lg bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
    secondary: 'rounded-lg border border-border bg-white text-ink-700 shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
    ghost: 'rounded-lg border border-transparent bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900',
    danger: 'rounded-lg bg-danger text-white shadow-sm hover:bg-red-700',
  };

  const sizes = {
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    md: 'min-h-10 px-4 py-2 text-sm',
    lg: 'min-h-11 px-5 py-2.5 text-base',
  };
</script>

<button
  {disabled}
  class={cn(
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    className
  )}
>
  {#if loading}
    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  {/if}
  {@render children?.()}
</button>
