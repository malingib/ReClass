import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  const db = locals.srv;

  // Try to find linked students via guardians_link -> parents relationship
  // Since parents table doesn't have a profile_id, we match by phone or email
  let attendance: any[] = [];
  let children: any[] = [];

  if (user) {
    const userPhone = user.phone || user.user_metadata?.phone || '';

    // Try to find parent record by phone or email
    if (userPhone || user.email) {
      const { data: parentRecord } = await db
        .from('parents')
        .select('id, full_name')
        .eq('tenant_id', locals.tenantId)
        .or(`phone.eq.${userPhone}${user.email ? `,email.eq.${user.email}` : ''}`)
        .maybeSingle();

      if (parentRecord) {
        // Get linked students
        const { data: links } = await db
          .from('guardians_link')
          .select('student_id, students(id, admission_no, first_name, last_name, grade)')
          .eq('parent_id', parentRecord.id);

        const studentIds = (links ?? []).map(l => l.student_id);
        children = (links ?? []).map(l => l.students).filter(Boolean);

        if (studentIds.length > 0) {
          const { data: att } = await db
            .from('attendance')
            .select('id, status, marked_at, student_id, occurrence_id, students(first_name, last_name, grade)')
            .in('student_id', studentIds)
            .eq('tenant_id', locals.tenantId)
            .order('marked_at', { ascending: false })
            .limit(100);

          attendance = att ?? [];
        }
      }
    }
  }

  return {
    attendance,
    children,
  };
};
