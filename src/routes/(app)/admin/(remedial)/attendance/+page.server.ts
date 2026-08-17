import type { PageServerLoad } from './$types';
import { getAttendanceByTenant } from '$lib/server/_remedial/attendance';
import { requireTenantRole } from '$lib/server/_auth/auth';
import { PAGE_LIST_LARGE } from '$lib/config';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal');
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));

  const result = await getAttendanceByTenant(locals.srv, tenantId, { page, pageSize: PAGE_LIST_LARGE });

  return {
    attendance: result.data.map((row: { teachers?: { first_name?: string; last_name?: string } | null; marked_at?: string | null; [k: string]: unknown }) => ({
      ...row,
      teacher_name: row.teachers ? `${row.teachers.first_name} ${row.teachers.last_name}` : 'Unknown',
      date: row.marked_at,
    })),
    pagination: { page, pageSize: PAGE_LIST_LARGE, total: result.total },
  };
};
