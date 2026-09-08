import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal', 'bursar');
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days') ?? 30)));
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const [{ data: attendance }, { data: payments }, { data: invoices }, { count: students }, { count: activeStudents }, { count: admissions }] = await Promise.all([
    (locals.srv as any).from('v_teacher_attendance_daily').select('day,attended,absent,total').eq('tenant_id', tenantId).gte('day', since).order('day'),
    locals.srv.from('payments').select('created_at,amount,status,method').eq('tenant_id', tenantId).gte('created_at', `${since}T00:00:00`).order('created_at'),
    locals.srv.from('invoices').select('amount_due,amount_paid,status').eq('tenant_id', tenantId).is('deleted_at', null),
    locals.srv.from('students').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('deleted_at', null),
    locals.srv.from('sis_enrollments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
    locals.srv.from('sis_admissions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', `${since}T00:00:00`)
  ]);
  const paid = (payments ?? []).filter((p:any) => p.status === 'paid');
  const collected = paid.reduce((n:number,p:any)=>n+Number(p.amount||0),0);
  const invoiced = (invoices ?? []).reduce((n:number,i:any)=>n+Number(i.amount_due||0),0);
  const paidLedger = (invoices ?? []).reduce((n:number,i:any)=>n+Number(i.amount_paid||0),0);
  const total = (attendance ?? []).reduce((n:number,d:any)=>n+Number(d.total||0),0);
  const present = (attendance ?? []).reduce((n:number,d:any)=>n+Number(d.attended||0),0);
  return { days, kpis:{students:students??0,activeStudents:activeStudents??0,admissions:admissions??0,collected,outstanding:Math.max(0,invoiced-paidLedger),attendanceRate:total?present/total*100:0}, attendanceTrend:(attendance??[]).slice(-14).map((d:any)=>({label:String(d.day).slice(5),value:Number(d.attended||0),secondary:Number(d.absent||0)})), paymentTrend:(payments??[]).slice(-12).map((p:any)=>({label:String(p.created_at).slice(5,10),value:Number(p.amount||0)})), recentPayments:(payments??[]).slice(-6).reverse() };
};
