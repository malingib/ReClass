<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';

  interface Column<T extends Record<string, unknown>> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (_item: T) => string;
    /** When true, the `render` output is injected as raw HTML (use only for
     *  trusted, server-controlled markup like print links with UUID ids). */
    html?: boolean;
    cell?: Snippet<[T]>;
  }

  // When `server` is provided the table delegates search / sort / paging to the
  // backend via URL query params (?page=&search=&sort=&dir=) instead of loading
  // the whole dataset and slicing in memory. `data` then holds only the current
  // page and `server.total` is the full row count.
  interface ServerMode {
    total: number;
    page: number;
    pageSize: number;
    search?: string;
    sortKey?: string | null;
    sortDir?: 'asc' | 'desc';
  }

  // Callers pass richer types via render functions. Svelte 5 templates
  // cannot flow generics through #each blocks, so props are typed loosely.

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
    server,
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
    server?: ServerMode;
  } = $props();

  // In server mode these are seeded from props once; navigation remounts the
  // page (fresh load data) so capturing the initial value is intentional.
  // svelte-ignore state_referenced_locally
  let sortKey = $state<string | null>(server?.sortKey ?? null);
  // svelte-ignore state_referenced_locally
  let sortDir = $state<'asc' | 'desc'>(server?.sortDir ?? 'asc');
  // svelte-ignore state_referenced_locally
  let currentPage = $state(server?.page ?? 1);
  // svelte-ignore state_referenced_locally
  let searchQuery = $state(server?.search ?? '');
  let deleteTarget = $state<any | null>(null);

  const isServer = $derived(!!server);
  const effectivePageSize = $derived(server?.pageSize ?? pageSize);

  // Push new query params and let the load function refetch the page.
  function serverNavigate(next: { page?: number; search?: string; sort?: string | null; dir?: 'asc' | 'desc' }) {
    const url = new URL(window.location.href);
    const p = url.searchParams;
    if (next.page !== undefined) p.set('page', String(next.page));
    if (next.search !== undefined) {
      if (next.search) p.set('search', next.search); else p.delete('search');
    }
    if (next.sort !== undefined) {
      if (next.sort) p.set('sort', next.sort); else p.delete('sort');
    }
    if (next.dir !== undefined) p.set('dir', next.dir);
    goto(`${url.pathname}?${p.toString()}`, { keepFocus: true, noScroll: true });
  }

  // Optimistic search with debouncing for better UX
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function handleSearch(e: Event) {
    const query = (e.target as HTMLInputElement).value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      serverNavigate({ search: query, page: 1 });
    }, 300);
  }

  function onSearchInput(value: string) {
    searchQuery = value;
    if (!isServer) return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => serverNavigate({ search: value, page: 1 }), 300);
  }

  function toggleSort(key: string) {
    if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = key; sortDir = 'asc'; }
    if (isServer) serverNavigate({ sort: sortKey, dir: sortDir, page: 1 });
  }

  const filtered = $derived(
    isServer
      ? data
      : searchQuery
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
    isServer
      ? filtered
      : [...filtered].sort((a, b) => {
          if (!sortKey) return 0;
          const aValue = a[sortKey];
          const bValue = b[sortKey];
          const aNumber = typeof aValue === 'number' ? aValue : Number(aValue);
          const bNumber = typeof bValue === 'number' ? bValue : Number(bValue);
          const numeric = aValue !== '' && bValue !== '' && Number.isFinite(aNumber) && Number.isFinite(bNumber);
          const comparison = numeric
            ? aNumber - bNumber
            : String(aValue ?? '').localeCompare(String(bValue ?? ''), undefined, { numeric: true, sensitivity: 'base' });
          return sortDir === 'asc' ? comparison : -comparison;
        })
  );

  const totalRows = $derived(isServer ? (server?.total ?? 0) : sorted.length);
  const totalPages = $derived(Math.max(1, Math.ceil(totalRows / effectivePageSize)));

  // Smart pagination: show first, last, current±2, ellipsis for gaps
  type PageItem = { type: 'page'; num: number } | { type: 'ellipsis'; key: string };

  const paginationItems = $derived.by((): PageItem[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => ({ type: 'page' as const, num: i + 1 }));
    }
    const items: PageItem[] = [{ type: 'page', num: 1 }];
    if (currentPage > 3) items.push({ type: 'ellipsis', key: 'start-e' });
    const rs = Math.max(2, currentPage - 2);
    const re = Math.min(totalPages - 1, currentPage + 2);
    for (let i = rs; i <= re; i++) items.push({ type: 'page', num: i });
    if (currentPage < totalPages - 2) items.push({ type: 'ellipsis', key: 'end-e' });
    items.push({ type: 'page', num: totalPages });
    return items;
  });

  // Reset to page 1 when search or data changes
  $effect(() => {
    if (!isServer && currentPage > totalPages) {
      currentPage = 1;
    }
  });

  const paginated = $derived(
    isServer ? sorted : sorted.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize)
  );

  const hasRowActions = $derived(!!onEdit || !!onDelete);

  function confirmDelete(item: any) {
    deleteTarget = item;
  }

  function handleConfirm() {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget);
    }
    deleteTarget = null;
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
      if (isServer) serverNavigate({ page: currentPage });
    }
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      if (isServer) serverNavigate({ page: currentPage });
    }
  }

  function gotoPage(page: number) {
    currentPage = page;
    if (isServer) serverNavigate({ page });
  }
</script>

{#if loading}
  <div class="space-y-2">
    {#each [1, 2, 3] as _i}
      <div class="skeleton h-11 w-full rounded-md"></div>
    {/each}
  </div>
{:else if data.length === 0}
  <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
    {#if isServer && searchQuery}
      <div class="border-b border-slate-200 px-4 py-3">
        <div class="relative">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search\u2026"
            value={searchQuery}
            oninput={handleSearch}
            aria-label="Search table data"
            class="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    {/if}
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
        </svg>
      </div>
      <p class="text-sm text-slate-500">{emptyMessage || 'No data yet'}</p>
    </div>
  </div>
{:else}
  <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <!-- Search bar -->
    <div class="border-b border-slate-200 px-4 py-3">
      <div class="relative">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Search\u2026"
          value={searchQuery}
          oninput={(e) => onSearchInput((e.currentTarget as HTMLInputElement).value)}
          aria-label="Search table data"
          class="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50">
            {#each columns as col}
              <th
                class="px-4 py-2.5 text-left text-xs font-medium text-slate-500 {col.sortable ? 'cursor-pointer' : ''}"
                aria-sort={col.sortable ? (sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
              >
                {#if col.sortable}
                  <button
                    type="button"
                    onclick={() => toggleSort(col.key)}
                    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSort(col.key)}
                    class="inline-flex items-center gap-1 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:rounded"
                  >
                    {col.label}
                    {#if sortKey === col.key}
                      <span class="text-[10px] text-primary" aria-hidden="true">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                    {/if}
                  </button>
                {:else}
                  <span>{col.label}</span>
                {/if}
              </th>
            {/each}
            {#if hasRowActions}
              <th class="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Actions</th>
            {/if}
            {#if rowExtra}
              <th class="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Manage</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each paginated as item (item.id)}
            <tr class="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50">
        {#each columns as col}
          <td class="border-b border-gray-200 p-2">
            {#if col.cell}
              {@render col.cell(item)}
            {:else if col.render}
              {#if col.html}
                {@html col.render(item)}
              {:else}
                {col.render(item)}
              {/if}
            {:else}
              {item[col.key] ?? '—'}
            {/if}
           </td>
          {/each}
          {#if hasRowActions}
            <td class="px-4 py-3 text-right">
              <div class="inline-flex items-center gap-3">
                {#if onEdit}
                  <button onclick={() => onEdit(item)} class="text-xs font-medium text-primary hover:underline">{typeof editLabel === 'function' ? editLabel(item) : editLabel ?? 'Edit'}</button>
                {/if}
                {#if onDelete}
                  <button onclick={() => confirmDelete(item)} class="text-xs font-medium text-slate-400 hover:text-red-600">{deleteLabel}</button>
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
      <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <p class="text-xs text-slate-500">
          {((currentPage - 1) * effectivePageSize) + 1}&ndash;{Math.min(currentPage * effectivePageSize, totalRows)} of {totalRows}
        </p>
        <div class="flex items-center gap-1.5">
          <button
            onclick={prevPage}
            disabled={currentPage <= 1}
            class="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {#each paginationItems as item (item.type === 'ellipsis' ? item.key : `p-${item.num}`)}
            {#if item.type === 'ellipsis'}
              <span class="px-1 text-xs text-slate-400" aria-hidden="true">&hellip;</span>
            {:else}
              <button
                onclick={() => gotoPage(item.num)}
                class="rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors {item.num === currentPage ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}"
              >
                {item.num}
              </button>
            {/if}
          {/each}
          <button
            onclick={nextPage}
            disabled={currentPage >= totalPages}
            class="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

{#if deleteTarget}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onclick={() => deleteTarget = null} onkeydown={(e) => e.key === 'Escape' && (deleteTarget = null)} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-base font-semibold text-slate-900">Confirm deletion</h3>
      <p class="mt-1.5 text-sm text-slate-600">This action cannot be undone. Are you sure you want to delete this item?</p>
      <div class="mt-5 flex items-center justify-end gap-2">
        <button onclick={() => deleteTarget = null} class="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onclick={handleConfirm} class="rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
      </div>
    </div>
  </div>
{/if}
