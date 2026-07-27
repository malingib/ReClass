import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/auth';

const ALLOWED_FIELDS = ['admission_no', 'first_name', 'last_name', 'grade', 'status'] as const;
const VALID_STATUSES = ['active', 'inactive'] as const;

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
      try { rawRecords = JSON.parse(raw); } catch { return fail(400, { error: 'Invalid records JSON' }); }
    } else if (file && file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',');
      rawRecords = lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => obj[h.trim()] = vals[i]?.trim());
        return obj;
      });
    }

    if (rawRecords.length === 0) return fail(400, { error: 'No records provided' });

    const BATCH_LIMIT = 500;
    if (rawRecords.length > BATCH_LIMIT) {
      return fail(400, { error: `Maximum ${BATCH_LIMIT} records per import` });
    }

    // Allowlist fields and construct clean insert records
    const records: Array<Record<string, string>> = [];
    for (const raw of rawRecords) {
      const record: Record<string, string> = { tenant_id: tenantId };
      for (const field of ALLOWED_FIELDS) {
        const val = raw[field]?.toString().trim();
        if (val) record[field] = val;
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
