import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  import: async ({ locals, request }) => {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const raw = form.get('records') as string | null;

    let records: any[] = [];
    if (raw) {
      try { records = JSON.parse(raw); } catch { return fail(400, { error: 'Invalid records JSON' }); }
    } else if (file && file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',');
      records = lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => obj[h.trim()] = vals[i]?.trim());
        return obj;
      });
    }

    if (records.length === 0) return fail(400, { error: 'No records provided' });

    // Attach tenant_id to every record
    for (const record of records) {
      record.tenant_id = locals.tenantId;
    }

    const { data, error } = await locals.srv.from('students').insert(records).select();

    if (error) return fail(500, { error: error.message });
    return { success: true, count: data?.length ?? 0 };
  },
};
