import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal', 'bursar');
  const days = Math.min(365, Math.max(7, Number(url.searchParams.get('days') ?? 30)));
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const [students, admissions, enrollments, payments, attendance, classes] = await Promise.all([
    locals.srv.from('students').select('id,status,gender,grade').eq('tenant_id', tenantId).is('deleted_at', null),
    locals.srv.from('sis_admissions').select('id,status,created_at').eq('tenant_id', tenantId).gte('created_at', since),
    locals.srv.from('sis_enrollments').select('id,status,academic_year,class_id').eq('tenant_id', tenantId),
    locals.srv.from('payments').select('amount,created_at,status,method').eq('tenant_id', tenantId).gte('created_at', since).order('created_at'),
    locals.srv.from('teacher_attendance').select('status,occurs_on').eq('tenant_id', tenantId).gte('occurs_on', since.slice(0, 10)).order('occurs_on'),
    locals.srv.from('sis_classes').select('id,name,stream,academic_year').eq('tenant_id', tenantId).is('deleted_at', null),
  ]);
  const rows = students.data ?? [];
  const admissionRows = admissions.data ?? [];
  const paymentRows = payments.data ?? [];
  const attendanceRows = attendance.data ?? [];
  const paid = paymentRows.filter((p: any) => ['paid','completed','success','successful'].includes(String(p.status).toLowerCase()));
  const present = attendanceRows.filter((a: any) => ['present','attended'].includes(String(a.status).toLowerCase())).length;
  const absent = attendanceRows.filter((a: any) => ['absent','missed'].includes(String(a.status).toLowerCase())).length;
  const byDay = new Map<string, {label:string; value:number; secondary:number}>();
  for (const a of attendanceRows as any[]) { const label=String(a.occurs_on).slice(5,10); const d=byDay.get(label)??{label,value:0,secondary:0}; if(['present','attended'].includes(String(a.status).toLowerCase())) d.value++; else if(['absent','missed'].includes(String(a.status).toLowerCase())) d.secondary++; byDay.set(label,d); }
  const byGrade = new Map<string,number>();
  for (const s of rows as any[]) byGrade.set(String(s.grade || 'Unassigned'), (byGrade.get(String(s.grade || 'Unassigned'))??0)+1);
  return {
    days,
    kpis:{students:rows.length, active: (enrollments.data??[]).filter((e:any)=>e.status==='active').length, admissions:admissionRows.length, collected:paid.reduce((n:number,p:any)=>n+Number(p.amount||0),0), attendanceRate:present+absent?present/(present+absent)*100:0},
    attendanceTrend:Array.from(byDay.values()).slice(-30),
    studentMix:Array.from(byGrade.entries()).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,8),
    admissionMix:['admitted','pending','rejected','withdrawn'].map(label=>({label,value:admissionRows.filter((a:any)=>String(a.status).toLowerCase()===label).length})).filter(x=>x.value>0),
    paymentTrend:paymentRows.slice(-30).map((p:any)=>({label:String(p.created_at).slice(5,10),value:Number(p.amount||0)})),
    classes:classes.data??[],
  };
};
