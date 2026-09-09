import { isValidElement } from 'react';

export function DataTable({ columns, rows, empty = 'No records.' }: {
  columns: string[];
  rows: unknown[][];
  empty?: string;
}) {
  if (rows.length === 0) return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{empty}</p>;
  const cell = (v: unknown) => (isValidElement(v) ? v : String((v as string | number | null | undefined) ?? '—'));
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                {r.map((cellValue, j) => (
                  <td key={j} className="px-4 py-3">{cell(cellValue)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
