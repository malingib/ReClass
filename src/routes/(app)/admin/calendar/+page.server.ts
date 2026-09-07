import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

const eventTypes = ['school', 'exam', 'meeting', 'holiday', 'activity', 'deadline', 'other'] as const;
const audiences = ['staff', 'teachers', 'parents', 'all'] as const;

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const from = new Date(Date.now() - 7 * 864e5).toISOString();
  const through = new Date(Date.now() + 60 * 864e5).toISOString();

  const { data, error } = await locals.srv
    .from('school_calendar_events')
    .select('id, title, event_type, starts_at, ends_at, all_day, audience, location, description, created_at')
    .eq('tenant_id', tenantId)
    .gte('starts_at', from)
    .lte('starts_at', through)
    .order('starts_at', { ascending: true });

  return { events: data ?? [], error: error?.message ?? null };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId, user } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const form = await request.formData();
    const title = form.get('title')?.toString().trim();
    const startsAt = form.get('starts_at')?.toString();
    const endsAt = form.get('ends_at')?.toString() || null;
    const eventType = form.get('event_type')?.toString();
    const audience = form.get('audience')?.toString();
    const location = form.get('location')?.toString().trim() || null;
    const description = form.get('description')?.toString().trim() || null;
    const allDay = form.get('all_day') === 'on';

    if (!title || !startsAt || !eventTypes.includes(eventType as (typeof eventTypes)[number]) || !audiences.includes(audience as (typeof audiences)[number])) {
      return fail(400, { error: 'Title, start time, event type and audience are required.' });
    }

    const { error } = await locals.srv.from('school_calendar_events').insert({
      tenant_id: tenantId,
      title,
      event_type: eventType,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      all_day: allDay,
      audience,
      location,
      description,
      created_by: user.id,
    });

    if (error) return fail(500, { error: 'Unable to create calendar event.' });
    return { success: true };
  },
} satisfies Actions;
