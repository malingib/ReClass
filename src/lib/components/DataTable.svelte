<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '$lib/i18n';
  import { goto } from '$app/navigation';

  interface Column<T extends Record<string, unknown>> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (_item: T) => string;
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
    deleteLabel = t('delete'),
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

  // Debounced server search.
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
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
      const aVal = String(a[sortKey] ?? '');
      const bVal = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
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
  <div class="space-y-3">
    {#each [1, 2, 3] as _i}
      <div class="skeleton h-12 w-full rounded-xl"></div>
    {/each}
  </div>
{:else if data.length === 0}
  {#if isServer && searchQuery}
  <div class="overflow-hidden rounded-[20px] border border-border/80 bg-white/70 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm">
    <div class="border-b border-border/70 px-4 py-3">
      <div class="relative">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Search\u2026"
          value={searchQuery}
          oninput={(e) => onSearchInput((e.currentTarget as HTMLInputElement).value)}
          class="w-full rounded-lg border border-border bg-ink-50 py-2 pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
    </div>
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p class="text-sm text-ink-500">{emptyMessage || 'No data yet'}</p>
    </div>
  </div>
  {:else}
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
  {/if}
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
          placeholder="Search\u2026"
          value={searchQuery}
          oninput={(e) => onSearchInput((e.currentTarget as HTMLInputElement).value)}
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
                aria-sort={col.sortable ? (sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
              >
                {#if col.sortable}
                  <button
                    type="button"
                    onclick={() => toggleSort(col.key)}
                    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSort(col.key)}
                    class="inline-flex items-center gap-1.5 hover:underline focus:outline-none focus:underline"
                  >
                    {col.label}
                    {#if sortKey === col.key}
                      <span class="text-[10px]" aria-hidden="true">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                    {/if}
                  </button>
                {:else}
                  <span class="inline-flex items-center gap-1.5">{col.label}</span>
                {/if}
              </th>
            {/each}
            {#if hasRowActions}
              <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-400">{t('actions')}</th>
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
                      <button onclick={() => onEdit(item)} class="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700">{typeof editLabel === 'function' ? editLabel(item) : editLabel ?? t('edit')}</button>
                    {/if}
                    {#if onDelete}
                      <button onclick={() => confirmDelete(item)} class="text-xs font-medium text-ink-400 transition-colors hover:text-danger">{deleteLabel}</button>
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
          {((currentPage - 1) * effectivePageSize) + 1}&ndash;{Math.min(currentPage * effectivePageSize, totalRows)} of {totalRows}
        </p>
        <div class="flex items-center gap-2">
          <button
            onclick={prevPage}
            disabled={currentPage <= 1}
            class="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {#each paginationItems as item (item.type === 'ellipsis' ? item.key : `p-${item.num}`)}
            {#if item.type === 'ellipsis'}
              <span class="px-1 text-xs text-ink-400" aria-hidden="true">&hellip;</span>
            {:else}
              <button
                onclick={() => gotoPage(item.num)}
                class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {item.num === currentPage ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-50'}"
              >
                {item.num}
              </button>
            {/if}
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

{#if deleteTarget}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onclick={() => deleteTarget = null} onkeydown={(e) => e.key === 'Escape' && (deleteTarget = null)} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold text-ink-900">Confirm deletion</h3>
      <p class="mt-2 text-sm text-ink-600">This action cannot be undone. Are you sure you want to delete this item?</p>
      <div class="mt-6 flex items-center justify-end gap-3">
        <button onclick={() => deleteTarget = null} class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        <button onclick={handleConfirm} class="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90">Delete</button>
      </div>
    </div>
  </div>
{/if}
