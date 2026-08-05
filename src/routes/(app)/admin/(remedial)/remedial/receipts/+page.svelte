<script lang="ts">
  import ReceiptsManager from '$lib/components/ReceiptsManager.svelte';
  const { data } = $props();
</script>

<ReceiptsManager
  title="Remedial Receipts"
  subtitle="Payment receipts — remedial fees collected via M-Pesa paybill"
  payments={data.payments}
/>
