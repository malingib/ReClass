<script lang="ts">
  import FeeManager from '$lib/components/FeeManager.svelte';
  import type { PageData } from './$types';
  const { data }: { data: PageData } = $props();
</script>

<FeeManager
  title="Remedial fee structures"
  subtitle="Fees collected from parents via M-Pesa paybill for remedial classes"
  emptyMessage="No remedial fee definitions yet"
  fees={data.fees}
/>
