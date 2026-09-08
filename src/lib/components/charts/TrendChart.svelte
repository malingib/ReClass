<script lang="ts">
  export let data: { label: string; value: number; secondary?: number }[] = [];
  export let height = 220;
  export let secondaryLabel = 'Secondary';
  export let primaryLabel = 'Primary';

  $: max = Math.max(1, ...data.flatMap((d) => [Number(d.value) || 0, Number(d.secondary) || 0]));
  $: width = Math.max(640, data.length * 72);
  $: points = data.map((d, i) => `${i * (width - 48) / Math.max(1, data.length - 1) + 24},${height - 24 - ((Number(d.value) || 0) / max) * (height - 56)}`).join(' ');
  $: secondaryPoints = data.map((d, i) => `${i * (width - 48) / Math.max(1, data.length - 1) + 24},${height - 24 - ((Number(d.secondary) || 0) / max) * (height - 56)}`).join(' ');
</script>

<div class="overflow-x-auto" role="img" aria-label={`${primaryLabel} trend chart`}>
  {#if data.length}
    <svg viewBox={`0 0 ${width} ${height}`} class="min-w-full" style={`height:${height}px`} preserveAspectRatio="none">
      <g class="text-slate-100" stroke="currentColor" stroke-width="1">
        {#each [0, .25, .5, .75, 1] as ratio}
          <line x1="24" x2={width - 24} y1={height - 24 - ratio * (height - 56)} y2={height - 24 - ratio * (height - 56)} />
        {/each}
      </g>
      <polyline points={points} fill="none" stroke="currentColor" class="text-primary" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      {#if data.some((d) => d.secondary !== undefined)}
        <polyline points={secondaryPoints} fill="none" stroke="currentColor" class="text-slate-300" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 5" />
      {/if}
      {#each data as d, i}
        {@const x = i * (width - 48) / Math.max(1, data.length - 1) + 24}
        {@const y = height - 24 - ((Number(d.value) || 0) / max) * (height - 56)}
        <circle cx={x} cy={y} r="4" class="fill-white stroke-primary" stroke-width="2" />
        <text x={x} y={height - 6} text-anchor="middle" class="fill-slate-400 text-[10px]">{d.label}</text>
      {/each}
    </svg>
    <div class="mt-2 flex items-center gap-4 text-xs text-slate-500">
      <span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-primary"></i>{primaryLabel}</span>
      {#if data.some((d) => d.secondary !== undefined)}<span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-slate-300"></i>{secondaryLabel}</span>{/if}
    </div>
  {:else}
    <div class="flex h-48 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">No data for this period.</div>
  {/if}
</div>
