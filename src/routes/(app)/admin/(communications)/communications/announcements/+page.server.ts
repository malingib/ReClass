import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';

const announcementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Message is required'),
  audience: z.enum(['all', 'teachers', 'parents', 'students', 'staff']).default('all'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

const idSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const { data } = await locals.srv
    .from('comm_announcements')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return { announcements: data ?? [] };
};

async function insertAnnouncement(locals: App.Locals, tenantId: string, data: z.output<typeof announcementSchema>) {
  const { error } = await locals.srv.from('comm_announcements').insert({
    tenant_id: tenantId,
    title: data.title,
    body: data.body,
    audience: data.audience,
    priority: data.priority,
    status: 'draft',
  });
  return error;
}

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(announcementSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const error = await insertAnnouncement(locals, tenantId, v.data);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Announcement created as draft' };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(announcementSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });

    const { error } = await locals.srv.from('comm_announcements')
      .update({
        title: v.data.title,
        body: v.data.body,
        audience: v.data.audience,
        priority: v.data.priority,
      })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Announcement updated' };
  },

  publish: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(idSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('comm_announcements')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Announcement published' };
  },

  unpublish: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(idSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('comm_announcements')
      .update({ status: 'draft', published_at: null })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Announcement moved back to draft' };
  },

  archive: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(idSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('comm_announcements')
      .update({ status: 'archived' })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Announcement archived' };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const v = parseForm(idSchema, await request.formData());
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('comm_announcements')
      .delete()
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Announcement deleted' };
  },
} satisfies Actions;
