<script lang="ts">
  import { scaleLinear, scaleBand } from 'd3-scale';
  import { max } from 'd3-array';

  let {
    data = [],
    height = 200,
    color = '#00c573',
    format = (v: number) => v.toLocaleString(),
  }: {
    data: { label: string; value: number }[];
    height?: number;
    color?: string;
    format?: (_v: number) => string;
  } = $props();

  let w = $derived(600);
  let h = $derived(height);
  let padX = $derived(36);
  let padY = $derived(24);
  let barData = $derived(data);

  let xScale = $derived(
    scaleBand()
      .domain(barData.map(d => d.label))
      .range([padX, w - padX])
      .padding(0.3)
  );

  let yScale = $derived(
    scaleLinear()
      .domain([0, max(barData.map(d => d.value)) || 1])
      .range([h - padY, padY])
  );
</script>

{#if barData.length === 0}
  <div class="text-sm text-ink-400 text-center py-8">No data</div>
{:else}
  <div class="w-full overflow-hidden">
    <svg viewBox="0 0 {w} {h}" class="w-full" style="height: {h}px">
      {#each [0.25, 0.5, 0.75] as t}
        <line x1={padX} y1={padY + t * (h - padY * 2)} x2={w - padX} y2={padY + t * (h - padY * 2)} stroke="#e5e5e5" stroke-width="1" />
      {/each}
      {#each barData as point}
        {@const barW = xScale.bandwidth()}
        {@const barH = h - padY - yScale(point.value)}
        {@const barX = (xScale(point.label) ?? 0)}
        {@const barY = yScale(point.value)}
        <rect x={barX} y={barY} width={barW} height={barH} rx="4" fill={color} opacity="0.8">
          <title>{point.label}: {format(point.value)}</title>
        </rect>
        <text x={barX + barW / 2} y={h - 6} text-anchor="middle" fill="#737373" font-size="11">
          {point.label}
        </text>
      {/each}
    </svg>
  </div>
{/if}
