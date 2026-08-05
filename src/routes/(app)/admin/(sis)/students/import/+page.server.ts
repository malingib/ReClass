import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

const ALLOWED_FIELDS = ['admission_no', 'first_name', 'last_name', 'grade', 'status'] as const;
const VALID_STATUSES = ['active', 'inactive'] as const;
const MAX_IMPORT_BYTES = 512 * 1024;
const MAX_FIELD_LENGTH = 120;
const BATCH_LIMIT = 500;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = cells[i]?.trim() ?? '';
    });
    return obj;
  });
}

export const load: PageServerLoad = async ({ locals }) => {
  requireTenantRole(locals, 'school_admin', 'super_admin');
  return {};
};

export const actions: Actions = {
  import: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const raw = form.get('records')?.toString() ?? null;

    let rawRecords: Record<string, string>[] = [];
    if (raw) {
      if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) {
        return fail(400, { error: 'Import payload is too large' });
      }
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return fail(400, { error: 'Records must be an array' });
        rawRecords = parsed;
      } catch {
        return fail(400, { error: 'Invalid records JSON' });
      }
    } else if (file && file.name.endsWith('.csv')) {
      if (file.size > MAX_IMPORT_BYTES) {
        return fail(400, { error: 'CSV file is too large' });
      }
      const text = await file.text();
      rawRecords = parseCsv(text);
    }

    if (rawRecords.length === 0) return fail(400, { error: 'No records provided' });

    if (rawRecords.length > BATCH_LIMIT) {
      return fail(400, { error: `Maximum ${BATCH_LIMIT} records per import` });
    }

    // Allowlist fields and construct clean insert records
    const records: Array<Record<string, string>> = [];
    for (const raw of rawRecords) {
      const record: Record<string, string> = { tenant_id: tenantId };
      for (const field of ALLOWED_FIELDS) {
        const val = raw[field]?.toString().trim();
        if (val) record[field] = val.slice(0, MAX_FIELD_LENGTH);
      }
      if (!record.first_name || !record.last_name) continue;
      if (record.status && !VALID_STATUSES.includes(record.status as (typeof VALID_STATUSES)[number])) {
        record.status = 'active';
      }
      if (!record.status) record.status = 'active';
      records.push(record);
    }

    if (records.length === 0) return fail(400, { error: 'No valid records after validation' });

    const { data, error } = await locals.srv.from('students').insert(records as never).select();

    if (error) {
      if (error.code === '23505') return fail(409, { error: 'Duplicate admission number found' });
      return fail(500, { error: 'Failed to import students' });
    }
    return { success: true, count: data?.length ?? 0 };
  },
};
