import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const sb = locals.srv;
  const tid = locals.tenantId;
  const since = new Date(Date.now() - 14 * 864e5).toISOString();

  const [
    { count: students }, { count: teachers }, { count: subjects }, { count: groups },
    { count: unpaid }, { count: paidInvoices },
    { data: rs }, { data: ri }, { data: ta }, { data: taTrend }, { data: occ }, { data: sessionsByStatus },
    { data: sum },
  ] = await Promise.all([
    sb.from('students').select('*', { count: 'exact', head: true }).eq('tenant_id', tid),
    sb.from('teachers').select('*', { count: 'exact', head: true }).eq('tenant_id', tid),
    sb.from('subjects').select('*', { count: 'exact', head: true }).eq('tenant_id', tid),
    sb.from('remedial_groups').select('*', { count: 'exact', head: true }).eq('tenant_id', tid),
    sb.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'unpaid'),
    sb.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'paid'),
    sb.from('students').select('id,admission_no,first_name,last_name,grade,created_at').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(5),
    sb.from('invoices').select('id,amount_due,amount_paid,status,due_date,created_at,students(first_name,last_name,admission_no)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(5),
    sb.from('teacher_attendance').select('*').eq('tenant_id', tid).gte('marked_at', since),
    sb.from('teacher_attendance').select('status,marked_at').eq('tenant_id', tid).gte('marked_at', since),
    sb.from('session_occurrences').select('id, occurs_on, status').eq('tenant_id', tid).gte('occurs_on', since),
    sb.from('session_occurrences').select('status, occurs_on').eq('tenant_id', tid).gte('occurs_on', since),
    sb.from('invoices').select('amount_due,amount_paid,status').eq('tenant_id', tid).eq('status', 'unpaid'),
  ]);

  const total = ta?.length ?? 0;
  const present = ta?.filter((a: any) => a.status === 'present' || a.status === 'late').length ?? 0;
  const rate = total ? Math.round((present / total) * 100) : 0;
  const sessionsCount = occ?.length ?? 0;
  const unpaidAmount = (sum ?? []).reduce((acc: number, row: any) => acc + Number(row.amount_due ?? 0) - Number(row.amount_paid ?? 0), 0);

  const trend: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const dayStr = d.toISOString().slice(0, 10);
    const rows = (taTrend || []).filter((a: any) => (a.marked_at || '').slice(0, 10) === dayStr);
    const dp = rows.filter((a: any) => a.status === 'present' || a.status === 'late').length;
    trend.push({ label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: rows.length ? Math.round((dp / rows.length) * 100) : 0 });
  }

  const activity: any[] = [
    ...(ta ?? []).slice(0, 4).map((a: any) => ({
      id: `att-${a.id}`,
      name: a.teacher_name ?? 'Teacher',
      detail: a.group_name ?? 'Remedial session',
      time: a.marked_at ? new Date(a.marked_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
      kind: 'attendance',
      badge: a.status === 'present' ? 'Present' : a.status === 'late' ? 'Late' : a.status === 'absent' ? 'Absent' : 'Marked',
    })),
    ...(ri || []).slice(0, 3).map((i: any) => ({
      id: `pmt-${i.id}`,
      name: i.students ? `${i.students.first_name} ${i.students.last_name}` : 'Unknown',
      detail: `${i.students ? `Adm ${i.students.admission_no ?? ''} · ` : ''}KES ${Number(i.amount_paid ?? 0).toLocaleString()} via M-Pesa paybill`,
      time: i.due_date ? new Date(i.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
      kind: 'payment',
      badge: i.status === 'paid' ? 'Paid' : i.status === 'partial' ? 'Partial' : 'Pending',
    })),
  ];

  return {
    stat: {
      students: students ?? 0,
      teachers: teachers ?? 0,
      subjects: subjects ?? 0,
      groups: groups ?? 0,
      unpaid: unpaid ?? 0,
      paidInvoices: paidInvoices ?? 0,
      unpaidAmount,
      attendanceRate: rate,
      sessionsCount,
    },
    recentStudents: rs ?? [],
    recentInvoices: (ri ?? []).map((i: any) => ({ ...i, parent: i.students ? `Parent of ${i.students.first_name} ${i.students.last_name}` : 'Unknown parent' })),
    trend,
    activity,
    sessionsSummary: sessionsByStatus ?? [],
  };
};
