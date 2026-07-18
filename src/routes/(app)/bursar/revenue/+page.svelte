<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();
  const total = $derived(data.total);
</script>

<DashboardContent title="Revenue" subtitle="M-Pesa STK collections over the last 12 months">
  <div class="rounded-xl border border-border bg-white p-6 shadow-card">
    <p class="text-sm text-ink-500">Total collected from paybill</p>
    <p class="mt-2 text-4xl font-semibold text-ink-900 [font-variant-numeric:tabular-nums]">KES {total.toLocaleString()}</p>
  </div>
</DashboardContent>
