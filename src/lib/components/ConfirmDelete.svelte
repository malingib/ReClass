<script lang="ts">
  import { enhance } from '$app/forms';
  import type { Snippet } from 'svelte';

  let {
    action,
    message,
    label = 'Delete',
    class: className = 'text-[11px] font-medium text-danger hover:text-danger/80',
    fields = {},
  }: {
    /** Form action, e.g. '?/delete' */
    action: string;
    /** Confirm dialog message — verb + noun, e.g. 'Delete student "Jane Doe"? This cannot be undone.' */
    message: string;
    /** Button label. Default 'Delete'. */
    label?: string;
    /** Tailwind classes for the button. */
    class?: string;
    /** Hidden fields to submit, e.g. { id: row.id } */
    fields?: Record<string, string | number>;
  } = $props();

  let pending = $state(false);

  function confirmSubmit(e: SubmitEvent) {
    if (!confirm(message)) {
      e.preventDefault();
      return;
    }
    pending = true;
  }
</script>

<form
  method="POST"
  {action}
  use:enhance={() => {
    return async ({ update }) => {
      await update();
      pending = false;
    };
  }}
  onsubmit={confirmSubmit}
  class="inline"
>
  {#each Object.entries(fields) as [k, v] (k)}
    <input type="hidden" name={k} value={v} />
  {/each}
  <button type="submit" disabled={pending} class={className} class:opacity-50={pending}>
    {pending ? 'Deleting…' : label}
  </button>
</form>
