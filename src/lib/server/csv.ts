
function escape(v: unknown): string {
  const s = String(v ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvResponse(headers: string[], rows: unknown[][], filename: string): Response {
  const head = headers.join(',') + '\n';
  const body = rows.map(r => r.map(escape).join(',')).join('\n');

  return new Response(head + body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
