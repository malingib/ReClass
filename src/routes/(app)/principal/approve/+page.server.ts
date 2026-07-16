import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.srv;
  const tenantFilter = { column: 'tenant_id', value: locals.tenantId } as const;

  const [attendanceRes, statsRes] = await Promise.all([
    db
      .from('attendance')
      .select(`
        id, occurrence_id, student_id, status, locked, edit_reason, marked_at,
        students!inner(first_name, last_name, admission_no),
        session_occurrences!inner(
          id, occurs_on, start_time, end_time,
          sessions!inner(id, day_of_week, start_time, end_time)
        )
      `)
      .eq('tenant_id', locals.tenantId)
      .eq('locked', false)
      .order('marked_at', { ascending: false })
      .limit(200),
    db
      .from('attendance')
      .select('status, locked', { count: 'exact', head: true })
      .eq('tenant_id', locals.tenantId)
      .eq('locked', false),
  ]);

  const pending = attendanceRes.data ?? [];
  const pendingCount = statsRes.count ?? 0;

  return {
    pending: pending.map((r: any) => ({
      id: r.id,
      student_name: `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`.trim() || '—',
      admission_no: r.students?.admission_no ?? '—',
      session_name: r.session_occurrences?.sessions?.id
        ? `Session #${r.session_occurrences.sessions.id}` : '—',
      slot: r.session_occurrences?.start_time
        ? `${r.session_occurrences.start_time ?? ''}–${r.session_occurrences.end_time ?? ''}` : '—',
      occurs_on: r.session_occurrences?.occurs_on,
      status: r.status,
      marked_at: r.marked_at,
    })),
    pendingCount,
  };
};

export const actions: Actions = {
  approve: async ({ locals, request }) => {
    const db = locals.srv;
    const form = await request.formData();
    const idsRaw = form.get('ids');

    if (!idsRaw || typeof idsRaw !== 'string') {
      return fail(400, { error: 'No records selected' });
    }

    let ids: string[];
    try {
      ids = JSON.parse(idsRaw);
    } catch {
      return fail(400, { error: 'Invalid selection data' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return fail(400, { error: 'No records selected' });
    }

    const { error } = await db
      .from('attendance')
      .update({ locked: true })
      .in('id', ids)
      .eq('tenant_id', locals.tenantId)
      .eq('locked', false);

    if (error) {
      console.error('Approve error:', error);
      return fail(500, { error: 'Failed to lock attendance records. Please try again.' });
    }

    // Write audit log entries
    const auditEntries = ids.map((id) => ({
      tenant_id: locals.tenantId,
      actor_id: locals.user?.id,
      action: 'attendance_approve',
      entity: 'attendance',
      entity_id: id,
      after: { locked: true },
    }));

    if (auditEntries.length > 0) {
      await db.from('audit_log').insert(auditEntries);
    }

    return { success: true, count: ids.length };
  },
};
