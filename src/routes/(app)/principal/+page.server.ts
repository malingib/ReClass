import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const db = locals.srv;

  const { count: students } = await db
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', locals.tenantId);

  const { count: teachers } = await db
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', locals.tenantId);

  // teacher_attendance table does not exist in the schema — return empty
  const total = 0;
  const rate = 0;

  const { data: groups } = await db
    .from('remedial_groups')
    .select('id, name, status')
    .eq('tenant_id', locals.tenantId);

  return {
    stats: {
      students: students ?? 0,
      teachers: teachers ?? 0,
      attendanceRate: rate,
      groups: groups?.length ?? 0,
    },
    groups: groups ?? [],
  };
};
