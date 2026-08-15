import { z } from 'zod/v3';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { parseForm } from '$lib/server/_platform/validation';
import { paginatedQuery } from '$lib/server/_platform/query';
import { provisionParent } from '$lib/server/_sis/provisioning';
import { PAGE_LIST_MEDIUM } from '$lib/config';

const PARENT_SORT_COLUMNS = new Set(['full_name', 'phone', 'national_id', 'email', 'created_at']);
const PARENT_SEARCH_COLUMNS = ['full_name', 'phone', 'email', 'national_id'];

const parentSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().min(1, 'Full name is required').max(200),
  phone: z.string().min(1, 'Phone is required').max(20),
  national_id: z.string().max(30).optional(),
  email: z.string().max(254).optional(),
  sms_consent: z.coerce.boolean().optional(),
});

const deleteSchema = z.object({ id: z.string() });

export const load: PageServerLoad = async ({ locals, url }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
  const db = locals.srv;

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const search = url.searchParams.get('search') ?? '';
  const sortKeyRaw = url.searchParams.get('sort');
  const sortKey = sortKeyRaw && PARENT_SORT_COLUMNS.has(sortKeyRaw) ? sortKeyRaw : 'full_name';
  const sortDir: 'asc' | 'desc' = url.searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  const paged = await paginatedQuery<Record<string, unknown>>(db, 'parents', tenantId, {
    select: 'id, full_name, phone, national_id, email, sms_consent, profile_id, created_at',
    order: { column: sortKey, ascending: sortDir === 'asc' },
    page,
    pageSize: PAGE_LIST_MEDIUM,
    filters: (q) => q.is('deleted_at', null),
    search: search ? { term: search, columns: PARENT_SEARCH_COLUMNS } : undefined,
  });

  type ParentRow = { id: string; students?: unknown[]; [k: string]: unknown };
  const result: ParentRow[] = paged.data as ParentRow[];

  if (result.length > 0) {
    const parentIds = result.map(p => p.id);
    const { data: links } = await db
      .from('guardians_link')
      .select('parent_id, students(id, first_name, last_name, admission_no, grade)')
      .in('parent_id', parentIds)
      .eq('tenant_id', tenantId);

    const linkMap: Record<string, unknown[]> = {};
    for (const link of links ?? []) {
      if (!linkMap[link.parent_id]) linkMap[link.parent_id] = [];
      if (link.students) linkMap[link.parent_id].push(link.students);
    }
    for (const p of result) {
      p.students = linkMap[p.id] ?? [];
    }
  }

  return {
    parents: result,
    pagination: {
      total: paged.total,
      page: paged.page,
      pageSize: paged.pageSize,
      search,
      sortKey,
      sortDir,
    },
  };
};

export const actions = {
  create: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(parentSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const nationalId = v.data.national_id?.trim() || null;
    if (!nationalId) return fail(400, { message: 'National ID is required to create a parent portal login.' });

    const { data: inserted, error } = await locals.srv.from('parents').insert({
      tenant_id: tenantId,
      full_name: v.data.full_name,
      phone: v.data.phone,
      national_id: nationalId,
      email: v.data.email || null,
      sms_consent: v.data.sms_consent ?? true,
    }).select('id').single();
    if (error) {
      if (error.code === '23505') return fail(409, { message: 'Another parent already uses this National ID in your school.' });
      return fail(500, { message: `Failed: ${error.message}` });
    }

    const provisioned = await provisionParent(locals.srv, tenantId, inserted.id);
    if (!provisioned.ok) return fail(400, { message: provisioned.message });

    return {
      success: true,
      message: provisioned.smsSent
        ? 'Parent created and login credentials sent by SMS.'
        : 'Parent created, but the login SMS was not sent. Review the parent-provision SMS toggle.',
    };
  },

  update: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(parentSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    if (!v.data.id) return fail(400, { message: 'ID required' });

    const nationalId = v.data.national_id?.trim() || null;
    const { error } = await locals.srv.from('parents')
      .update({
        full_name: v.data.full_name,
        phone: v.data.phone,
        national_id: nationalId,
        email: v.data.email || null,
        sms_consent: v.data.sms_consent ?? true,
      })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) {
      if (error.code === '23505') return fail(409, { message: 'Another parent already uses this National ID in your school.' });
      return fail(500, { message: `Failed: ${error.message}` });
    }

    // Re-provision when the parent has login credentials, so a phone edit keeps
    // the account password + SMS in sync. Legacy parents without a National ID
    // stay un-provisioned until one is added.
    if (nationalId) {
      const provisioned = await provisionParent(locals.srv, tenantId, v.data.id, { resend: true });
      if (!provisioned.ok) return fail(400, { message: provisioned.message });
    }

    return {
      success: true,
      message: 'Parent updated successfully',
    };
  },

  resend: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });

    const provisioned = await provisionParent(locals.srv, tenantId, v.data.id, { resend: true });
    if (!provisioned.ok) return fail(400, { message: provisioned.message });

    return {
      success: true,
      message: provisioned.smsSent
        ? 'Login credentials re-sent by SMS.'
        : 'Login updated. SMS not sent (check SMS consent or the parent-provision SMS toggle).',
    };
  },

  delete: async ({ locals, request }) => {
    const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin');
    const fd = await request.formData();
    const v = parseForm(deleteSchema, fd);
    if (!v.success) return fail(400, { errors: v.errors });
    const { error } = await locals.srv.from('parents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', v.data.id)
      .eq('tenant_id', tenantId);
    if (error) return fail(500, { message: `Failed: ${error.message}` });
    return { success: true, message: 'Parent deleted successfully' };
  },
} satisfies Actions;
