<script lang="ts">
  const { label, value, sub = '', trend, pos }: {
    label: string; value: string | number; sub?: string; trend?: string; pos?: boolean;
  } = $props();
</script>

<div class="rounded-lg border border-slate-200 bg-white p-4">
  <p class="text-xs font-medium text-slate-500">{label}</p>
  <p class="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">{value}</p>
  {#if trend}
    <p class="mt-1 flex items-center gap-1 text-xs font-medium {pos ? 'text-emerald-600' : 'text-red-500'}">
      {pos ? '↑' : '↓'} {trend}
    </p>
  {:else if sub}
    <p class="mt-1 text-xs text-slate-500">{sub}</p>
  {/if}
</div>
