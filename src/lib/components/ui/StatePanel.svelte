<script lang="ts">
  import { AlertCircle, Inbox, Loader2 } from 'lucide-svelte';

  let {
    state = 'empty',
    title,
    description = '',
    action,
  }: {
    state?: 'loading' | 'empty' | 'error';
    title: string;
    description?: string;
    action?: { label: string; href: string };
  } = $props();
</script>

<div class="rounded-2xl border border-dashed border-border/70 bg-white px-5 py-10 text-center sm:px-8" role={state === 'error' ? 'alert' : undefined}>
  {#if state === 'loading'}
    <Loader2 class="mx-auto h-7 w-7 animate-spin text-primary" aria-hidden="true" />
  {:else if state === 'error'}
    <AlertCircle class="mx-auto h-7 w-7 text-red-500" aria-hidden="true" />
  {:else}
    <Inbox class="mx-auto h-7 w-7 text-ink-300" aria-hidden="true" />
  {/if}
  <h2 class="mt-3 text-sm font-semibold text-ink-800">{title}</h2>
  {#if description}<p class="mx-auto mt-1 max-w-md text-xs leading-5 text-ink-500">{description}</p>{/if}
  {#if action}
    <a href={action.href} class="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">{action.label}</a>
  {/if}
</div>
