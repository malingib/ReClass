<script lang="ts">
  interface Column<T> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (_item: T) => string;
  }

  let {
    columns,
    data,
    loading = false,
    onEdit,
    onDelete,
    deleteLabel = 'Delete',
    emptyMessage,
  }: {
    columns: Column<any>[];
    data: any[];
    loading?: boolean;
    onEdit?: (_item: any) => void;
    onDelete?: (_item: any) => void;
    deleteLabel?: string;
    emptyMessage?: string;
  } = $props();

  let sortKey = $state<string | null>(null);
  let sortDir = $state<'asc' | 'desc'>('asc');

  function toggleSort(key: string) {
    if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = key; sortDir = 'asc'; }
  }

  let sorted = $derived(
    [...data].sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = String(a[sortKey] ?? '');
      const bVal = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    })
  );

  let hasRowActions = $derived(!!onEdit || !!onDelete);
</script>

{#if loading}
  <div class="space-y-3">
    {#each [1, 2, 3] as i}
      <div class="skeleton h-12 w-full rounded-xl"></div>
    {/each}
  </div>
{:else if data.length === 0}
  <div class="overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm">
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
        </svg>
      </div>
      <p class="text-sm text-ink-500">{emptyMessage || 'No data yet'}</p>
    </div>
  </div>
{:else}
  <div class="overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border/70 bg-ink-50/70">
            {#each columns as col}
              <th
                class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400 {col.sortable ? 'cursor-pointer hover:text-brand-500' : ''}"
                onclick={() => col.sortable && toggleSort(col.key)}
              >
                <span class="inline-flex items-center gap-1.5">
                  {col.label}
                  {#if sortKey === col.key}
                    <span class="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  {/if}
                </span>
              </th>
            {/each}
            {#if hasRowActions}
              <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Actions</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each sorted as item, idx (item.id)}
            <tr class="border-b border-border/70 transition-colors last:border-b-0 hover:bg-brand-50/40 {idx % 2 === 0 ? 'bg-white/60' : 'bg-ink-50/40'}">
              {#each columns as col}
                <td class="px-4 py-3 text-ink-700">
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              {/each}
              {#if hasRowActions}
                <td class="px-4 py-3 text-right">
                  <div class="inline-flex items-center gap-3">
                    {#if onEdit}
                      <button onclick={() => onEdit(item)} class="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700">Edit</button>
                    {/if}
                    {#if onDelete}
                      <button onclick={() => onDelete(item)} class="text-xs font-medium text-ink-400 transition-colors hover:text-danger">{deleteLabel}</button>
                    {/if}
                  </div>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}
