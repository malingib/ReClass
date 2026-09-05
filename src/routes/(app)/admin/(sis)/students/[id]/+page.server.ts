import { fail } from '@sveltejs/kit';
import { z } from 'zod/v3';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';
import { getStudent360, recordLifecycleEvent } from '$lib/server/_sis/lifecycle';

const eventSchema = z.object({ event_type: z.enum(['progressed','transferred','withdrawn','expelled','archived','restored','other']), effective_on: z.string().min(1), reason: z.string().max(500).optional(), notes: z.string().max(2000).optional() });
const exitSchema = z.object({ event_type: z.enum(['transferred','withdrawn','expelled','other']), effective_on: z.string().min(1), reason: z.string().max(500).optional(), notes: z.string().max(2000).optional() });

export const load: PageServerLoad = async ({ locals, params }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const result = await getStudent360(locals.srv, tenantId, params.id);
  if (!result.student) return fail(404, { message: 'Student not found' });
  return result;
};

export const actions = {
  event: async ({ locals, params, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(eventSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const result = await recordLifecycleEvent(locals.srv, { tenantId, studentId: params.id, eventType: v.data.event_type, effectiveOn: v.data.effective_on, reason: v.data.reason || null, notes: v.data.notes || null, actorId: locals.user?.id || null });
    if (!result.ok) return fail(500, { message: result.error.message ?? 'Could not record event.' });
    return { success: true, message: 'Lifecycle event recorded.' };
  },
  exit: async ({ locals, params, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(exitSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const result = await recordLifecycleEvent(locals.srv, { tenantId, studentId: params.id, eventType: v.data.event_type, effectiveOn: v.data.effective_on, reason: v.data.reason || null, notes: v.data.notes || null, actorId: locals.user?.id || null });
    if (!result.ok) return fail(500, { message: result.error.message ?? 'Could not record exit.' });
    return { success: true, message: 'Exit event recorded. Existing history is preserved.' };
  },
} satisfies Actions;
