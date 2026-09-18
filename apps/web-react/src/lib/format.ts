/** Shared display formatters — single source for money, dates, phones. */

export function moneyKES(value: unknown): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '—';
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function moneyCompactKES(value: unknown): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '—';
  return `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

export function dateKE(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function datetimeKE(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Normalize a Kenyan phone to 254… digits. Returns '' when invalid. */
export function normalizeKEPhone(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return '';
}

export function phoneDisplay(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length < 9) return String(raw ?? '—');
  return `+${digits}`;
}

export function fullName(first?: string | null, last?: string | null, fallback = '—'): string {
  const name = `${first ?? ''} ${last ?? ''}`.trim();
  return name || fallback;
}

export function truncateId(id: unknown, len = 8): string {
  const s = String(id ?? '');
  return s.length > len ? `${s.slice(0, len)}…` : s || '—';
}
