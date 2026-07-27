export async function getSisStats(sb: App.Locals['srv'], tenantId: string) {
  const [students, classes, admissions, enrollments] = await Promise.all([
    sb.from('students').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).then(r => r.count ?? 0),
    sb.from('sis_classes').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).then(r => r.count ?? 0),
    sb.from('sis_admissions').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).then(r => r.count ?? 0),
    sb.from('sis_enrollments').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active').then(r => r.count ?? 0),
  ]);
  return { students, classes, admissions, enrollments };
}

export async function getSisClasses(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb.from('sis_classes').select('*, teachers(first_name, last_name)').eq('tenant_id', tenantId).order('name');
  return data ?? [];
}

export async function getSisAdmissions(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb.from('sis_admissions').select('*, students(first_name, last_name, admission_no)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  return data ?? [];
}

export async function getSisEnrollments(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb.from('sis_enrollments').select('*, students(first_name, last_name, admission_no), sis_classes(name, stream, code)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  return data ?? [];
}
