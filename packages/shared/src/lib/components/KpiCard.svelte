<script lang="ts">
  const { label, value, sub = '', trend, pos }: {
    label: string; value: string | number; sub?: string; trend?: string; pos?: boolean;
  } = $props();
</script>

<div class="relative overflow-hidden rounded-xl border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hov">
  <div class="flex items-start justify-between">
    <div class="space-y-1">
      <p class="text-sm font-medium text-ink-500">{label}</p>
      <p class="mt-1 text-3xl font-semibold tracking-tight text-ink-900 [font-variant-numeric:tabular-nums]">{value}</p>
      {#if trend}
        <p class="flex items-center gap-1 text-xs font-medium {pos ? 'text-emerald-600' : 'text-red-500'}">
          <span>{pos ? '↑' : '↓'}</span>
          {trend}
        </p>
      {/if}
      {#if sub && !trend}
        <p class="text-xs text-ink-400">{sub}</p>
      {/if}
    </div>
  </div>
</div>
