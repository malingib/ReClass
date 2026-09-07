import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin');
  const { data } = await locals.srv.from('school_calendar_events').select('id,title,event_type,starts_at,ends_at,all_day,audience,location,description').eq('tenant_id', tenantId).order('starts_at').limit(200);
  return { events: data ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId, userId } = requireTenantRole(locals, 'school_admin', 'principal', 'super_admin');
    const f = await request.formData(); const title = String(f.get('title') ?? '').trim(); const starts = String(f.get('starts_at') ?? '');
    if (!title || !starts) return fail(400, { error: 'Title and start time are required' });
    const ends = String(f.get('ends_at') ?? '');
    const { error } = await locals.srv.from('school_calendar_events').insert({ tenant_id: tenantId, title, event_type: String(f.get('event_type') || 'school'), starts_at: new Date(starts).toISOString(), ends_at: ends ? new Date(ends).toISOString() : null, all_day: f.get('all_day') === 'on', audience: String(f.get('audience') || 'staff'), location: String(f.get('location') || '') || null, description: String(f.get('description') || '') || null, created_by: userId });
    if (error) return fail(500, { error: error.message }); return { success: true };
  },
} satisfies Actions;
