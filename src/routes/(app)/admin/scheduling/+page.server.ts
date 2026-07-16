import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const tid = locals.tenantId;

  const [schedRes, grpRes] = await Promise.all([
    locals.srv
      .from('sessions')
      .select(`
        id, day_of_week, start_time, end_time, slot, active,
        group_id,
        remedial_groups!inner ( name, room, subject_id, subjects!inner ( name ) )
      `)
      .eq('tenant_id', tid)
      .order('day_of_week'),
    locals.srv
      .from('remedial_groups')
      .select('id, name')
      .eq('tenant_id', tid)
      .order('name'),
  ]);

  const flat = (schedRes.data ?? []).map((s: any) => ({
    id: s.id,
    title: s.remedial_groups?.name ?? '',
    subject: s.remedial_groups?.subjects?.name ?? '',
    grade: '',
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    slot: s.slot,
    active: s.active,
  }));

  return { schedules: flat, groups: grpRes.data ?? [] };
};

export const actions = {
  create: async ({ locals, request }) => {
    const tid = locals.tenantId;
    const data = await request.formData();
    const group_id = data.get('group_id')?.toString();
    const day_of_week = Number(data.get('day_of_week'));
    const start_time = data.get('start_time')?.toString();
    const end_time = data.get('end_time')?.toString();
    const slot = data.get('slot')?.toString() || null;

    if (!group_id || !start_time || !end_time || !day_of_week) {
      return fail(400, { error: 'Group, day, start and end time required' });
    }

    const { error } = await locals.srv.from('sessions').insert({
      tenant_id: tid,
      group_id,
      day_of_week,
      start_time,
      end_time,
      slot,
      active: true,
    });
    if (error) return fail(500, { error: error.message });
    return { success: true };
  },

  delete: async ({ locals, request }) => {
    const data = await request.formData();
    const id = data.get('id')?.toString();
    if (!id) return fail(400, { error: 'Session ID required' });

    const { error } = await locals.srv.from('sessions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', locals.tenantId);
    if (error) return fail(500, { error: error.message });
    return { success: true };
  },

  toggle: async ({ locals, request }) => {
    const data = await request.formData();
    const id = data.get('id')?.toString();
    const active = data.get('active') === 'true';
    if (!id) return fail(400, { error: 'Session ID required' });

    const { error } = await locals.srv.from('sessions')
      .update({ active })
      .eq('id', id)
      .eq('tenant_id', locals.tenantId);
    if (error) return fail(500, { error: error.message });
    return { success: true };
  },
} satisfies Actions;
