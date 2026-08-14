<script lang="ts">
  import { onMount } from 'svelte';
  import { chartTheme } from './theme';

  const {
    data = [],
    height = 220,
    color = chartTheme.brand,
    unit = '',
    format = (v: number) => v.toLocaleString(),
  }: {
    data: { label: string; value: number }[];
    height?: number;
    color?: string;
    unit?: string;
    format?: (v: number) => string;
  } = $props();

  let svgEl: SVGSVGElement = $state()!;
  let containerEl: HTMLDivElement = $state()!;
  let width = $state(600);
  let d3 = $state<typeof import('d3-scale') & typeof import('d3-shape') & typeof import('d3-array') | null>(null);
  let activeIndex = $state<number | null>(null);

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
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      if (rect.width) width = rect.width;
    }
  });

  const w = $derived(width);
  const h = $derived(height);
  const padL = $derived(48); // room for y-axis labels
  const padR = $derived(16);
  const padT = $derived(16);
  const padB = $derived(34); // room for x-axis labels
  const lineData = $derived(data);
  const gradId = $derived(`lineFill-${color.startsWith('#') ? color.slice(1) : 'custom'}`);

  const xScale = $derived(
    d3?.scalePoint<string>()
      .domain(lineData.map((d) => d.label))
      .range([padL, w - padR]),
  );

  const maxVal = $derived(d3?.max(lineData.map((d) => d.value)) ?? 0);
  const yScale = $derived(
    d3?.scaleLinear()
      .domain([0, maxVal || 1])
      .nice()
      .range([h - padB, padT]),
  );

  // Labeled y-axis ticks aligned to gridlines
  const yTicks = $derived(yScale ? yScale.ticks(4) : []);

  const lineGenerator = $derived(
    d3?.line<{ label: string; value: number }>()
      .x((d) => xScale?.(d.label) ?? 0)
      .y((d) => yScale?.(d.value) ?? 0)
      .curve(d3?.curveMonotoneX),
  );

  const areaGenerator = $derived(
    d3?.area<{ label: string; value: number }>()
      .x((d) => xScale?.(d.label) ?? 0)
      .y0(h - padB)
      .y1((d) => yScale?.(d.value) ?? 0)
      .curve(d3?.curveMonotoneX),
  );

  const linePath = $derived(lineGenerator?.(lineData) ?? '');
  const areaPath = $derived(areaGenerator?.(lineData) ?? '');

  // X labels: rotate when dense to avoid overlap
  const xLabelRotated = $derived(lineData.length > 8);

  function onPointerMove(e: PointerEvent) {
    if (!d3 || !xScale || lineData.length === 0) return;
    const rect = svgEl.getBoundingClientRect();
    const xPos = ((e.clientX - rect.left) / rect.width) * w;
    // nearest point by x
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < lineData.length; i++) {
      const px = xScale(lineData[i].label) ?? 0;
      const d = Math.abs(px - xPos);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    activeIndex = best;
  }

  function onPointerLeave() {
    activeIndex = null;
  }

  const activePoint = $derived(activeIndex != null ? lineData[activeIndex] : null);
  const activeX = $derived(activeIndex != null ? xScale?.(lineData[activeIndex].label) ?? 0 : 0);
  const activeY = $derived(activeIndex != null ? yScale?.(lineData[activeIndex].value) ?? 0 : 0);
  // Tooltip placement (clamped inside the plot)
  const tipX = $derived(Math.min(Math.max(activeX, padL + 60), w - padR - 60));
  const tipAnchor = $derived(activeX > w / 2 ? 'end' : 'start');
</script>

{#if lineData.length === 0}
  <div class="text-sm text-ink-400 text-center py-8">No data</div>
{:else}
  <div class="w-full overflow-hidden" bind:this={containerEl}>
    <svg
      bind:this={svgEl}
      viewBox="0 0 {w} {h}"
      class="w-full touch-none select-none"
      style="height: {h}px"
      onpointermove={onPointerMove}
      onpointerleave={onPointerLeave}
      role="img"
      aria-label="Line chart"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={color} stop-opacity="0.20" />
          <stop offset="100%" stop-color={color} stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- y gridlines + axis labels -->
      {#each yTicks as t}
        {@const ty = yScale?.(t) ?? 0}
        <line x1={padL} y1={ty} x2={w - padR} y2={ty} stroke={chartTheme.grid} stroke-width="1" />
        <text x={padL - 8} y={ty + 3.5} text-anchor="end" fill={chartTheme.axisLabel} font-size="10">
          {format(t)}
        </text>
      {/each}

      <!-- axis lines -->
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke={chartTheme.axis} stroke-width="1" />
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke={chartTheme.axis} stroke-width="1" />

      <!-- area + line -->
      <path d={areaPath} fill="url(#{gradId})" />
      <path d={linePath} fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

      <!-- points -->
      {#each lineData as point, i}
        {@const px = xScale?.(point.label) ?? 0}
        {@const py = yScale?.(point.value) ?? 0}
        <circle cx={px} cy={py} r={activeIndex === i ? 5 : 3} fill={activeIndex === i ? color : '#fff'}
          stroke={color} stroke-width="2" />
      {/each}

      <!-- x labels -->
      {#each lineData as point, i}
        {#if i % Math.ceil(lineData.length / 6) === 0 || i === lineData.length - 1}
          {@const px = xScale?.(point.label) ?? 0}
          <text
            x={px}
            y={h - padB + 16}
            text-anchor={xLabelRotated ? 'end' : 'middle'}
            transform={xLabelRotated ? `rotate(-35 ${px} ${h - padB + 16})` : ''}
            fill={chartTheme.axisLabel}
            font-size="10"
          >
            {point.label}
          </text>
        {/if}
      {/each}

      <!-- crosshair + tooltip on hover -->
      {#if activePoint}
        <line x1={activeX} y1={padT} x2={activeX} y2={h - padB} stroke={color} stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />
        <g transform="translate({tipX}, {Math.max(activeY - 14, padT + 4)})" pointer-events="none">
          <rect
            x={tipAnchor === 'end' ? -108 : 0}
            y={0}
            width="108"
            height="34"
            rx="6"
            fill={chartTheme.tooltipBg}
            opacity="0.94"
          />
          <text x={tipAnchor === 'end' ? -100 : 8} y="14" fill={chartTheme.tooltipText} font-size="10">
            {activePoint.label}
          </text>
          <text x={tipAnchor === 'end' ? -100 : 8} y="27" fill={chartTheme.tooltipValue} font-size="12" font-weight="600">
            {format(activePoint.value)}{unit ? ` ${unit}` : ''}
          </text>
        </g>
      {/if}
    </svg>
  </div>
{/if}
