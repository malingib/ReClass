<script lang="ts">
  export let data: { label: string; value: number }[] = [];
  export let centerLabel = 'Total';
  export let centerValue = '';
  const r = 58;
  const circumference = 2 * Math.PI * r;
  $: total = Math.max(1, data.reduce((sum, d) => sum + (Number(d.value) || 0), 0));
  $: segments = data.reduce((acc, d) => { const previous = acc.length ? acc[acc.length - 1].offset : 0; acc.push({ ...d, offset: previous + ((Number(d.value) || 0) / total) * circumference }); return acc; }, [] as {label:string;value:number;offset:number}[]);
</script>

<div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
  <div class="relative h-40 w-40 shrink-0">
    <svg viewBox="0 0 144 144" class="h-full w-full -rotate-90">
      <circle cx="72" cy="72" r={r} fill="none" stroke="currentColor" stroke-width="18" class="text-slate-100" />
      {#each segments as d, i}
        {@const previous = i === 0 ? 0 : segments[i - 1].offset}
        <circle cx="72" cy="72" r={r} fill="none" stroke="currentColor" stroke-width="18" class={i % 3 === 0 ? 'text-primary' : i % 3 === 1 ? 'text-slate-400' : 'text-slate-300'} stroke-dasharray={`${Math.max(0, d.offset - previous)} ${circumference}`} stroke-dashoffset={-previous} />
      {/each}
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center"><strong class="text-xl text-slate-950">{centerValue || total}</strong><span class="text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</span></div>
  </div>
  <div class="w-full space-y-2">
    {#each data as d, i}<div class="flex items-center justify-between gap-3 text-xs"><span class="flex items-center gap-2 text-slate-600"><i class={`h-2.5 w-2.5 rounded-full ${i % 3 === 0 ? 'bg-primary' : i % 3 === 1 ? 'bg-slate-400' : 'bg-slate-300'}`}></i>{d.label}</span><strong class="text-slate-900">{d.value.toLocaleString()}</strong></div>{/each}
  </div>
</div>
