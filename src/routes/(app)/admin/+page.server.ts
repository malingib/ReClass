import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const sb = locals.supabase;
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days') || 30)));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [students, admissions, enrollments, payments, attendance] = await Promise.all([
    sb.from('students').select('id,status', { count: 'exact', head: false }).is('deleted_at', null),
    sb.from('sis_admissions').select('id,status', { count: 'exact', head: false }).gte('created_at', since),
    sb.from('sis_enrollments').select('id,status', { count: 'exact', head: false }).eq('status', 'active'),
    sb.from('payments').select('amount,created_at,status').gte('created_at', since).order('created_at', { ascending: true }),
    sb.from('teacher_attendance').select('status,occurs_on').gte('occurs_on', since.slice(0, 10)).order('occurs_on', { ascending: true })
  ]);

  const paymentRows = payments.data ?? [];
  const collected = paymentRows.filter((p: any) => ['paid','completed','success','successful'].includes(String(p.status).toLowerCase())).reduce((n: number, p: any) => n + Number(p.amount || 0), 0);
  const attendanceRows = attendance.data ?? [];
  const present = attendanceRows.filter((a: any) => ['present','attended'].includes(String(a.status).toLowerCase())).length;
  const absent = attendanceRows.filter((a: any) => ['absent','missed'].includes(String(a.status).toLowerCase())).length;

  const byDay = new Map<string, { label: string; value: number; secondary: number }>();
  for (const row of attendanceRows as any[]) {
    const day = String(row.occurs_on).slice(5, 10);
    const item = byDay.get(day) ?? { label: day, value: 0, secondary: 0 };
    if (['present','attended'].includes(String(row.status).toLowerCase())) item.value += 1; else if (['absent','missed'].includes(String(row.status).toLowerCase())) item.secondary += 1;
    byDay.set(day, item);
  }

  return {
    days,
    kpis: {
      students: students.count ?? 0,
      activeStudents: enrollments.count ?? 0,
      admissions: admissions.count ?? 0,
      collected,
      attendanceRate: present + absent ? (present / (present + absent)) * 100 : 0
    },
    attendanceTrend: Array.from(byDay.values()).slice(-14),
    paymentTrend: paymentRows.slice(-12).map((p: any) => ({ label: String(p.created_at).slice(5, 10), value: Number(p.amount || 0) })),
    admissionMix: [
      { label: 'Admitted', value: (admissions.data ?? []).filter((a: any) => String(a.status).toLowerCase() === 'admitted').length },
      { label: 'Pending', value: (admissions.data ?? []).filter((a: any) => String(a.status).toLowerCase() === 'pending').length },
      { label: 'Other', value: (admissions.data ?? []).filter((a: any) => !['admitted','pending'].includes(String(a.status).toLowerCase())).length }
    ],
    recentPayments: paymentRows.slice(-6).reverse()
  };
};
