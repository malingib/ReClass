<script lang="ts">
  import { page } from '$app/stores';

  let { error }: { error: App.Error } = $props();
  let status = $derived($page.status);
</script>

<svelte:head>
  <title>ReClass — {status}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-white px-4">
  <div class="max-w-md text-center">
    <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
      <svg class="h-10 w-10 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    </div>
    <h1 class="text-4xl font-bold text-ink-900">{status}</h1>
    <p class="mt-3 text-lg text-ink-500">
      {#if status === 404}
        The page you're looking for doesn't exist.
      {:else if status === 403}
        You don't have permission to access this page.
      {:else}
        {typeof error === 'string' ? error : error?.message ?? 'Something went wrong. Please try again.'}
      {/if}
    </p>
    <div class="mt-8 flex items-center justify-center gap-4">
      <a href="/" class="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors">
        Go home
      </a>
      <button onclick={() => location.reload()} class="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 transition-colors">
        Try again
      </button>
    </div>
  </div>
</div>
