<script lang="ts">
  import { onMount } from 'svelte';

  const {
    open,
    onOpenChange,
    payment,
    students,
    feeTypes,
  }: {
    open: boolean;
    onOpenChange: (_value: boolean) => void;
    payment: any | null;
    students: any[];
    feeTypes: any[];
  } = $props();

  let loaded = $state(false);
  let ReceiptModal = $state<any>(null);

  onMount(() => {
    if (open && !loaded) {
      import('./ReceiptModal.svelte').then(mod => {
        ReceiptModal = mod.default;
        loaded = true;
      });
    }
  });

  // Also load when open changes to true
  $effect(() => {
    if (open && !loaded) {
      import('./ReceiptModal.svelte').then(mod => {
        ReceiptModal = mod.default;
        loaded = true;
      });
    }
  });
</script>

{#if loaded && ReceiptModal}
  <ReceiptModal {open} {onOpenChange} {payment} {students} {feeTypes} />
{/if}
