type Db = App.Locals['srv'];
type Row = Record<string, unknown>;
type Query = PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> & { select: (columns?: string) => Query; eq: (column: string, value: unknown) => Query; is: (column: string, value: unknown) => Query; order: (column: string, opts?: { ascending?: boolean }) => Query; limit: (value: number) => Query; single: () => Query };
type Client = { from: (table: string) => Query & { insert: (values: Row | Row[]) => Query; update: (values: Row) => Query }; rpc: (name: string, params: Row) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> };
const db = (sb: Db) => sb as unknown as Client;

export async function getStudent360(sb: Db, tenantId: string, studentId: string) {
  const client = db(sb);
  const [student, guardians, enrollments, events, documents, invoices, remedial, admissions] = await Promise.all([
    client.from('students').select('id,tenant_id,admission_no,student_no,first_name,middle_name,last_name,date_of_birth,gender,admission_date,nationality,birth_certificate_no,photo_url,status,archived_at,created_at').eq('id', studentId).eq('tenant_id', tenantId).is('deleted_at', null).single(),
    client.from('guardians_link').select('parent_id,relationship,is_primary,parents(id,full_name,phone,email)').eq('student_id', studentId).eq('tenant_id', tenantId),
    client.from('sis_enrollments').select('id,class_id,academic_year,status,enrolled_at,exited_at,sis_classes(id,name,stream,code)').eq('student_id', studentId).eq('tenant_id', tenantId).order('enrolled_at', { ascending: false }),
    client.from('student_lifecycle_events').select('id,event_type,effective_on,reason,notes,created_at').eq('student_id', studentId).eq('tenant_id', tenantId).order('effective_on', { ascending: false }).order('created_at', { ascending: false }).limit(100),
    client.from('student_documents').select('id,document_type,document_name,status,uploaded_at,verified_at,notes').eq('student_id', studentId).eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }),
    client.from('invoices').select('id,amount_due,amount_paid,status,due_date,fee_type_id').eq('student_id', studentId).eq('tenant_id', tenantId).is('deleted_at', null).order('due_date', { ascending: true }),
    client.from('group_members').select('id,group_id,enrolled_at,remedial_groups(id,name,term,subject_id)').eq('student_id', studentId).eq('tenant_id', tenantId).order('enrolled_at', { ascending: false }),
    client.from('sis_admissions').select('id,admission_number,admission_date,grade_applied,status,previous_school,notes,created_at').eq('student_id', studentId).eq('tenant_id', tenantId).order('created_at', { ascending: false }),
  ]);
  return { student: student.data as Row | null, guardians: (guardians.data ?? []) as Row[], enrollments: (enrollments.data ?? []) as Row[], events: (events.data ?? []) as Row[], documents: (documents.data ?? []) as Row[], invoices: (invoices.data ?? []) as Row[], remedial: (remedial.data ?? []) as Row[], admissions: (admissions.data ?? []) as Row[], error: student.error };
}

export async function getEnrollmentOptions(sb: Db, tenantId: string) {
  const { data } = await db(sb).from('sis_classes').select('id,name,stream,code,academic_year,status').eq('tenant_id', tenantId).eq('status', 'active').order('name');
  return (data ?? []) as Row[];
}

export async function getStudentsForEnrollment(sb: Db, tenantId: string) {
  const { data } = await db(sb).from('students').select('id,admission_no,student_no,first_name,last_name').eq('tenant_id', tenantId).is('deleted_at', null).eq('status', 'active').order('first_name', { ascending: true });
  return (data ?? []) as Row[];
}

export async function createEnrollment(sb: Db, input: { tenantId: string; studentId: string; classId: string; academicYear: string; enrolledOn: string; actorId?: string | null }) {
  const client = db(sb);
  const { data, error } = await client.from('sis_enrollments').insert({ tenant_id: input.tenantId, student_id: input.studentId, class_id: input.classId, academic_year: input.academicYear, enrolled_at: input.enrolledOn, status: 'active' }).select('id').single();
  if (error) return { ok: false as const, error };
  const enrollment = data as Row;
  const { error: lifecycleError } = await client.from('student_lifecycle_events').insert({ tenant_id: input.tenantId, student_id: input.studentId, enrollment_id: enrollment.id, event_type: 'enrolled', effective_on: input.enrolledOn, actor_id: input.actorId || null, notes: `Enrolled for academic year ${input.academicYear}.` });
  if (lifecycleError) return { ok: false as const, error: lifecycleError };
  return { ok: true as const, enrollment };
}

export async function recordLifecycleEvent(sb: Db, input: { tenantId: string; studentId: string; enrollmentId?: string | null; eventType: string; effectiveOn: string; reason?: string | null; notes?: string | null; actorId?: string | null }) {
  const { error } = await db(sb).from('student_lifecycle_events').insert({ tenant_id: input.tenantId, student_id: input.studentId, enrollment_id: input.enrollmentId || null, event_type: input.eventType, effective_on: input.effectiveOn, reason: input.reason || null, notes: input.notes || null, actor_id: input.actorId || null });
  return error ? { ok: false as const, error } : { ok: true as const };
}

export async function admitApplication(sb: Db, input: { tenantId: string; admissionId: string; actorId: string; admissionNo: string; studentNo?: string | null }) {
  const { data, error } = await db(sb).rpc('admit_sis_application', { p_tenant_id: input.tenantId, p_admission_id: input.admissionId, p_actor_id: input.actorId, p_admission_no: input.admissionNo, p_student_no: input.studentNo || null });
  return error ? { ok: false as const, error } : { ok: true as const, studentId: String(data) };
}
