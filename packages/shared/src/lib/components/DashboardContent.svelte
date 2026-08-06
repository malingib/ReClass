<script lang="ts">
  const { title, subtitle = '', headerActions, rightRail, children }: {
    title: string;
    subtitle?: string;
    headerActions?: import('svelte').Snippet;
    rightRail?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<div class="space-y-8">
  {#if title || subtitle || headerActions || rightRail}
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {#if subtitle}
          <p class="mt-1 text-sm text-slate-500">{subtitle}</p>
        {/if}
      </div>
      {#if headerActions}
        <div class="flex shrink-0 items-center gap-3">
          {@render headerActions()}
        </div>
      {/if}
    </div>
  {/if}

  <div class="flex gap-6">
    <div class="min-w-0 flex-1">
      {@render children?.()}
    </div>
    {#if rightRail}
      <aside class="hidden w-80 shrink-0 2xl:block">
        {@render rightRail()}
      </aside>
    {/if}
  </div>
</div>
