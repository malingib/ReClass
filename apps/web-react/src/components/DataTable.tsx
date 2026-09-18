import { useMemo, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button, Input } from './ui';

type Cell = unknown;

/**
 * App-wide data table: sortable headers, global search, client pagination.
 * Keeps the legacy {columns, rows} signature so all existing pages upgrade
 * without rewrites. Server-driven tables (students, attendance) keep their
 * own pager and pass pagination="server".
 */
export function DataTable({ columns, rows, empty = 'No records.', searchPlaceholder = 'Search…', pageSize = 10, pagination = 'client', mobileCard }: {
  columns: string[];
  rows: Cell[][];
  empty?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  pagination?: 'client' | 'server' | 'none';
  /** Welfare-connect ResponsiveTable port: render rows as cards on mobile. */
  mobileCard?: (row: Cell[], index: number) => ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const isMobile = useIsMobile();

  const defs = useMemo<ColumnDef<Cell[]>[]>(() => columns.map((header, i) => ({
    id: String(i),
    header,
    accessorFn: (row) => {
      const v = row[i];
      return typeof v === 'string' || typeof v === 'number' ? v : '';
    },
    cell: ({ row }) => {
      const v = row.original[i];
      if (v !== null && typeof v === 'object') return v as ReactNode;
      return String((v as string | number | null | undefined) ?? '—');
    },
    enableSorting: true,
  })), [columns]);

  const table = useReactTable({
    data: rows,
    columns: defs,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pagination === 'client' ? getPaginationRowModel() : undefined,
    initialState: { pagination: { pageSize } },
  });

  const bodyRows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder={searchPlaceholder} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} aria-label="Search table" />
      </div>
      {isMobile && mobileCard ? (
        <div className="space-y-3">
          {bodyRows.length === 0 && <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{empty}</p>}
          {bodyRows.map((r, i) => (
            <div key={r.id}>{mobileCard(r.original, i)}</div>
          ))}
        </div>
      ) : (
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b bg-muted/50">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      {String(h.column.columnDef.header ?? '').trim() ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className={cn('inline-flex items-center gap-1 py-1 hover:text-foreground', !h.column.getCanSort() && 'pointer-events-none')}
                        aria-label={`Sort by ${String(h.column.columnDef.header)}`}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === 'asc' ? <ArrowUp className="size-3" /> : h.column.getIsSorted() === 'desc' ? <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />}
                      </button>
                      ) : null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {bodyRows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  {r.getVisibleCells().map((c) => <td key={c.id} className="px-4 py-3">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bodyRows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{empty}</p>}
      </div>
      )}
      {pagination === 'client' && total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {total} rows</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
