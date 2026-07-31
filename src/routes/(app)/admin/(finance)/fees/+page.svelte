<script lang="ts">
  import FeeManager from '$lib/components/FeeManager.svelte';
  import type { PageData } from './$types';
  const { data }: { data: PageData } = $props();
</script>

<FeeManager
  title="Fee structures"
  subtitle="Termly fee definitions invoiced to students"
  emptyMessage="No school fee definitions yet"
  fees={data.fees}
/>
