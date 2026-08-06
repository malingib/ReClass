<script lang="ts">
  import { onMount } from 'svelte';

  const {
    data = [],
    height = 200,
    color = '#00c573',
    unit: _unit = '',
    format = (v: number) => v.toLocaleString(),
  }: {
    data: { label: string; value: number }[];
    height?: number;
    color?: string;
    unit?: string;
    format?: (_v: number) => string;
  } = $props();

  let svgEl: SVGSVGElement = $state()!;
  let width = $state(600);
  let d3 = $state<typeof import('d3-scale') & typeof import('d3-shape') & typeof import('d3-array') | null>(null);

  // Lazy-load d3 (~50 KB) only when the chart has data and is visible
  onMount(() => {
    if (data.length === 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          Promise.all([
            import('d3-scale'),
            import('d3-shape'),
            import('d3-array'),
          ]).then(([scale, shape, arr]) => {
            d3 = { ...scale, ...shape, ...arr } as any;
          });
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    if (svgEl) observer.observe(svgEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (svgEl) {
      const rect = svgEl.parentElement?.getBoundingClientRect();
      if (rect) width = rect.width;
    }
  });

  const w = $derived(width);
  const h = $derived(height);
  const padX = $derived(36);
  const padY = $derived(24);
  const lineData = $derived(data);

  const xScale = $derived(
    d3?.scalePoint()
      .domain(lineData.map(d => d.label))
      .range([padX, w - padX])
  );

  const yScale = $derived(
    d3?.scaleLinear()
      .domain([0, d3?.max(lineData.map(d => d.value)) || 1])
      .range([h - padY, padY])
  );

  const lineGenerator = $derived(
    d3?.line<{ label: string; value: number }>()
      .x(d => xScale?.(d.label) ?? 0)
      .y(d => yScale?.(d.value) ?? 0)
      .curve(d3?.curveMonotoneX)
  );

  const areaGenerator = $derived(
    d3?.area<{ label: string; value: number }>()
      .x(d => xScale?.(d.label) ?? 0)
      .y0(h - padY)
      .y1(d => yScale?.(d.value) ?? 0)
      .curve(d3?.curveMonotoneX)
  );

  const linePath = $derived(lineGenerator?.(lineData) ?? '');
  const areaPath = $derived(areaGenerator?.(lineData) ?? '');
</script>

{#if lineData.length === 0}
  <div class="text-sm text-ink-400 text-center py-8">No data</div>
{:else}
  <div class="w-full overflow-hidden">
    <svg bind:this={svgEl} viewBox="0 0 {w} {h}" class="w-full" style="height: {h}px">
      <defs>
        <linearGradient id="lineFill-{color.replace('#', '')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={color} stop-opacity="0.18" />
          <stop offset="100%" stop-color={color} stop-opacity="0" />
        </linearGradient>
      </defs>
      {#each [0.25, 0.5, 0.75] as t}
        <line x1={padX} y1={padY + t * (h - padY * 2)} x2={w - padX} y2={padY + t * (h - padY * 2)} stroke="#e5e5e5" stroke-width="1" />
      {/each}
      <path d={areaPath} fill="url(#lineFill-{color.replace('#', '')})" />
      <path d={linePath} fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      {#each lineData as point, i}
        {#if i % Math.ceil(lineData.length / 6) === 0}
          <text x={xScale?.(point.label)} y={h - 6} text-anchor="middle" fill="#737373" font-size="11">
            {point.label}
          </text>
        {/if}
        {@const px = xScale?.(point.label) ?? 0}
        {@const py = yScale?.(point.value) ?? 0}
        <circle cx={px} cy={py} r="3.5" fill="#fff" stroke={color} stroke-width="2">
          <title>{point.label}: {format(point.value)}</title>
        </circle>
      {/each}
    </svg>
  </div>
{/if}
