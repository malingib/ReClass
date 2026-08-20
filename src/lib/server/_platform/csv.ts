
function escape(v: unknown): string {
  let s = String(v ?? '');
  // Neutralize spreadsheet formula injection (OWASP CSV Injection):
  // cells starting with = + - @ (after optional whitespace/BOM) are
  // interpreted as formulas by Excel/Sheets. Prefix with a single quote
  // so the content is treated as text. Tab (0x09) prefix bypass is also
  // covered by trimming then checking the first char.
  const trimmed = s.trimStart();
  if (/^[=+\-@]/.test(trimmed) || /^\t/.test(s)) {
    s = `'${s}`;
  }
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
