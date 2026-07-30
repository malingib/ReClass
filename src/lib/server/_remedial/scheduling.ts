import { fail } from '@sveltejs/kit';

export async function getSchedules(sb: App.Locals['srv'], tenantId: string) {
  const [schedRes, subjRes, teachRes] = await Promise.all([
    sb
      .from('sessions')
      .select(`
        id, day_of_week, start_time, end_time, slot, active, room,
        class,
        subjects!inner ( name ),
        teachers!inner ( first_name, last_name )
      `)
      .eq('tenant_id', tenantId)
      .order('day_of_week'),
    sb.from('subjects').select('id, name').eq('tenant_id', tenantId).order('name'),
    sb.from('teachers').select('id, first_name, last_name').eq('tenant_id', tenantId).order('first_name'),
  ]);

  interface RawSession {
    id: string; class: string | null; day_of_week: number; start_time: string; end_time: string;
    slot: string | null; room: string | null; active: boolean;
    subjects: { name: string } | null; teachers: { first_name: string; last_name: string } | null;
  }

  const schedules = ((schedRes.data ?? []) as RawSession[]).map((s) => ({
    id: s.id,
    title: `${s['class'] ?? 'Class'} — ${s.subjects?.name ?? ''}`,
    subject: s.subjects?.name ?? '',
    grade: s['class'] ?? '',
    teacher: s.teachers ? `${s.teachers.first_name} ${s.teachers.last_name}` : '',
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    slot: s.slot,
    room: s.room,
    active: s.active,
  }));

  return {
    schedules,
    subjects: subjRes.data ?? [],
    teachers: (teachRes.data ?? []).map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}` })),
  };
}

export async function createSession(sb: App.Locals['srv'], tid: string, data: Record<string, FormDataEntryValue | null>) {
  const classVal = data['class']?.toString().trim();
  const subject_id = data['subject_id']?.toString();
  const teacher_id = data['teacher_id']?.toString();
  const day_of_week = Number(data['day_of_week']);
  const start_time = data['start_time']?.toString();
  const end_time = data['end_time']?.toString();
  const room = data['room']?.toString().trim();
  const slot = data['slot']?.toString() || null;

  if (!classVal || !subject_id || !teacher_id || !start_time || !end_time || !room || day_of_week < 1 || day_of_week > 7) {
    return fail(400, { error: 'Class, subject, teacher, room, day, start and end time are required' });
  }
  if (start_time >= end_time) return fail(400, { error: 'End time must be after start time' });

  const [{ data: subject }, { data: teacher }] = await Promise.all([
    sb.from('subjects').select('id').eq('id', subject_id).eq('tenant_id', tid).maybeSingle(),
    sb.from('teachers').select('id').eq('id', teacher_id).eq('tenant_id', tid).maybeSingle(),
  ]);
  if (!subject || !teacher) return fail(400, { error: 'Subject or teacher does not belong to this school' });

  const { data: overlaps } = await sb
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

  const { error } = await sb.from('sessions').insert({
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
  return { success: true as const };
}

export async function softDeleteSession(sb: App.Locals['srv'], tenantId: string, id: string) {
  if (!id) return fail(400, { error: 'Session ID required' });

  const { error } = await sb.from('sessions')
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) return fail(500, { error: error.message });
  return { success: true as const };
}

export async function toggleSessionActive(sb: App.Locals['srv'], tenantId: string, id: string, active: boolean) {
  if (!id) return fail(400, { error: 'Session ID required' });

  const { error } = await sb.from('sessions')
    .update({ active })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) return fail(500, { error: error.message });
  return { success: true as const };
}
