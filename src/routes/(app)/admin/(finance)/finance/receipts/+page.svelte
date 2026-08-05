<script lang="ts">
  import ReceiptsManager from '$lib/components/ReceiptsManager.svelte';
  const { data } = $props();
</script>

<ReceiptsManager
  title="School Receipts"
  subtitle="Payment receipts — school fees collected via bank (KCB/Buni) and M-Pesa"
  payments={data.payments}
/>
