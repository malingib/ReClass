<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Column<T> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (_item: T) => string;
  }

  const {
    columns,
    data,
    loading = false,
    onEdit,
    onDelete,
    editLabel,
    deleteLabel = 'Delete',
    emptyMessage,
    pageSize = 25,
    rowExtra,
  }: {
    columns: Column<any>[];
    data: any[];
    loading?: boolean;
    onEdit?: (_item: any) => void;
    onDelete?: (_item: any) => void;
    editLabel?: string | ((_item: any) => string);
    deleteLabel?: string;
    emptyMessage?: string;
    pageSize?: number;
    rowExtra?: Snippet<[any]>;
  } = $props();

  let sortKey = $state<string | null>(null);
  let sortDir = $state<'asc' | 'desc'>('asc');
  let currentPage = $state(1);
  let searchQuery = $state('');

  function toggleSort(key: string) {
    if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = key; sortDir = 'asc'; }
  }

  const filtered = $derived(
    searchQuery
      ? data.filter((item: any) => {
          const q = searchQuery.toLowerCase();
          return columns.some((col) => {
            const val = col.render ? col.render(item) : String(item[col.key] ?? '');
            return val.toLowerCase().includes(q);
          });
        })
      : data
  );

  const sorted = $derived(
    [...filtered].sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = String(a[sortKey] ?? '');
      const bVal = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    })
  );

  const totalPages = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));

  // Reset to page 1 when search or data changes
  $effect(() => {
    if (currentPage > totalPages) {
      currentPage = 1;
    }
  });

  const paginated = $derived(
    sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );

  const hasRowActions = $derived(!!onEdit || !!onDelete);

  function prevPage() {
    if (currentPage > 1) currentPage--;
  }

  function nextPage() {
    if (currentPage < totalPages) currentPage++;
  }
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
    <!-- Search bar -->
    <div class="border-b border-border/70 px-4 py-3">
      <div class="relative">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Search…"
          bind:value={searchQuery}
          class="w-full rounded-lg border border-border bg-ink-50 py-2 pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
    </div>
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
            {#if rowExtra}
              <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">Manage</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each paginated as item, idx (item.id)}
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
                      <button onclick={() => onEdit(item)} class="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700">{typeof editLabel === 'function' ? editLabel(item) : editLabel ?? 'Edit'}</button>
                    {/if}
                    {#if onDelete}
                      <button onclick={() => onDelete(item)} class="text-xs font-medium text-ink-400 transition-colors hover:text-danger">{deleteLabel}</button>
                    {/if}
                  </div>
                </td>
              {/if}
              {#if rowExtra}
                <td class="px-4 py-3 text-right">
                  {@render rowExtra(item)}
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between border-t border-border/70 px-4 py-3">
        <p class="text-xs text-ink-500">
          {((currentPage - 1) * pageSize) + 1}&ndash;{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
        </p>
        <div class="flex items-center gap-2">
          <button
            onclick={prevPage}
            disabled={currentPage <= 1}
            class="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
            <button
              onclick={() => currentPage = page}
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {page === currentPage ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-50'}"
            >
              {page}
            </button>
          {/each}
          <button
            onclick={nextPage}
            disabled={currentPage >= totalPages}
            class="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
