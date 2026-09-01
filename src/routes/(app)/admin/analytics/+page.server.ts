import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { tenantId } = requireTenantRole(locals, 'school_admin', 'super_admin', 'principal', 'bursar');
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days') ?? 30)));
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const [{ data: attendance }, { data: payroll }, { data: payments }, { data: invoices }] = await Promise.all([
    locals.srv.from('v_teacher_attendance_daily').select('day,attended,absent,total').eq('tenant_id', tenantId).gte('day', since).order('day'),
    locals.srv.from('v_payroll_weekly').select('period_start,period_end,teacher_count,payroll_total,paid_teachers,confirmed_teachers').eq('tenant_id', tenantId).order('period_start'),
    locals.srv.from('payments').select('created_at,amount,status,method').eq('tenant_id', tenantId).gte('created_at', `${since}T00:00:00`).order('created_at'),
    locals.srv.from('invoices').select('amount_due,amount_paid,status').eq('tenant_id', tenantId).is('deleted_at', null),
  ]);
  const paidPayments=(payments??[]).filter((p:any)=>p.status==='paid');
  const collected=paidPayments.reduce((n:any,p:any)=>n+Number(p.amount||0),0);
  const invoiced=(invoices??[]).reduce((n:any,i:any)=>n+Number(i.amount_due||0),0);
  const paidLedger=(invoices??[]).reduce((n:any,i:any)=>n+Number(i.amount_paid||0),0);
  const attendanceTotal=(attendance??[]).reduce((n:any,d:any)=>n+Number(d.total||0),0);
  const attendanceAttended=(attendance??[]).reduce((n:any,d:any)=>n+Number(d.attended||0),0);
  return { days, attendance:attendance??[], payroll:payroll??[], payments:payments??[], kpis:{collected, outstanding:Math.max(0,invoiced-paidLedger), invoices:invoiced, attendanceRate:attendanceTotal?attendanceAttended/attendanceTotal*100:0, paidTransactions:paidPayments.length} };
};
