import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { requireTenantRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId: tid } = requireTenantRole(locals, 'school_admin', 'super_admin');

  const [schedRes, subjRes, teachRes] = await Promise.all([
    locals.srv
      .from('sessions')
      .select(`
        id, day_of_week, start_time, end_time, slot, active, room,
        class,
        subjects!inner ( name ),
        teachers!inner ( first_name, last_name )
      `)
      .eq('tenant_id', tid)
      .order('day_of_week'),
    locals.srv
      .from('subjects')
      .select('id, name')
      .eq('tenant_id', tid)
      .order('name'),
    locals.srv
      .from('teachers')
      .select('id, first_name, last_name')
      .eq('tenant_id', tid)
      .order('first_name'),
  ]);

  const flat = (schedRes.data ?? []).map((s: any) => ({
    id: s.id,
    title: `${s.class ?? 'Class'} — ${s.subjects?.name ?? ''}`,
    subject: s.subjects?.name ?? '',
    grade: s.class ?? '',
    teacher: s.teachers ? `${s.teachers.first_name} ${s.teachers.last_name}` : '',
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    slot: s.slot,
    room: s.room,
    active: s.active,
  }));

  return {
    schedules: flat,
    subjects: subjRes.data ?? [],
    teachers: teachRes.data ?? [],
  };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId: tid } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const data = await request.formData();
    const classVal = data.get('class')?.toString().trim();
    const subject_id = data.get('subject_id')?.toString();
    const teacher_id = data.get('teacher_id')?.toString();
    const day_of_week = Number(data.get('day_of_week'));
    const start_time = data.get('start_time')?.toString();
    const end_time = data.get('end_time')?.toString();
    const room = data.get('room')?.toString().trim();
    const slot = data.get('slot')?.toString() || null;

    if (!classVal || !subject_id || !teacher_id || !start_time || !end_time || !room || day_of_week < 1 || day_of_week > 7) {
      return fail(400, { error: 'Class, subject, teacher, room, day, start and end time are required' });
    }
    if (start_time >= end_time) return fail(400, { error: 'End time must be after start time' });

    const [{ data: subject }, { data: teacher }] = await Promise.all([
      locals.srv.from('subjects').select('id').eq('id', subject_id).eq('tenant_id', tid).maybeSingle(),
      locals.srv.from('teachers').select('id').eq('id', teacher_id).eq('tenant_id', tid).maybeSingle(),
    ]);
    if (!subject || !teacher) return fail(400, { error: 'Subject or teacher does not belong to this school' });

    const { data: overlaps } = await locals.srv
      .from('sessions')
      .select('id, class, room, teacher_id')
      .eq('tenant_id', tid)
      .eq('day_of_week', day_of_week)
      .eq('active', true)
      .is('deleted_at', null)
      .lt('start_time', end_time)
      .gt('end_time', start_time);
    const conflict = (overlaps ?? []).find((session) =>
      session.teacher_id === teacher_id ||
      session.class?.trim().toLowerCase() === classVal.toLowerCase() ||
      session.room?.trim().toLowerCase() === room.toLowerCase()
    );
    if (conflict) return fail(409, { error: 'This time overlaps another session for the teacher, class, or room.' });

    const { error } = await locals.srv.from('sessions').insert({
      tenant_id: tid,
      class: classVal,
      subject_id,
      teacher_id,
      day_of_week,
      start_time,
      end_time,
      room,
      slot,
      active: true,
    });
    if (error) return fail(500, { error: error.message });
    return { success: true };
  },
  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const data = await request.formData();
    const id = data.get('id')?.toString();
    if (!id) return fail(400, { error: 'Session ID required' });

    const { error } = await locals.srv.from('sessions')
      .update({ active: false, deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { error: error.message });
    return { success: true };
  },
  toggle: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const data = await request.formData();
    const id = data.get('id')?.toString();
    const active = data.get('active') === 'true';
    if (!id) return fail(400, { error: 'Session ID required' });

    const { error } = await locals.srv.from('sessions')
      .update({ active })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { error: error.message });
    return { success: true };
  },
} satisfies Actions;
