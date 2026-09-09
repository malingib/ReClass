import { getServiceClient } from '../_shared/supabase.ts';
import { handleOptions, unauthorized, forbidden, badRequest } from '../_shared/response.ts';
import { verifyAuth } from '../_shared/auth.ts';

// Replaces the six SvelteKit CSV +server.ts endpoints:
// revenue, students, subjects, teacher-attendance, teachers (+ bursar csv).
// Parity: same columns as src/routes/(app)/admin/(finance)/reports/*-csv.
const EXPORT_MAX_ROWS = 5000;
const REPORT_ROLES = ['school_admin', 'super_admin', 'principal', 'bursar'];

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const user = await verifyAuth(req.headers.get('Authorization'));
  if (!user) return unauthorized(req);

  const supabase = getServiceClient();
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id);
  const held = (roleRows ?? []) as { role: string; tenant_id: string }[];
  const grant = held.find((r) => REPORT_ROLES.includes(r.role));
  if (!grant) return forbidden(req);
  const tid = grant.tenant_id;

  let body: { report?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('INVALID_JSON', req);
  }

  const name = (n: { first_name?: string; last_name?: string }) => `${n?.first_name ?? ''} ${n?.last_name ?? ''}`.trim();
  let csv = '';

  if (body.report === 'revenue') {
    const { data } = await supabase
      .from('payments')
      .select('id,amount,method,domain,bank_reference,mpesa_receipt,phone,receipt_no,created_at,students!inner(first_name,last_name,admission_no,grade),fee_types(name)')
      .eq('tenant_id', tid)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(EXPORT_MAX_ROWS);
    csv = toCsv(
      ['Student', 'Admission No', 'Grade', 'Fee', 'Amount (KES)', 'Channel', 'Reference', 'Receipt No', 'Created At'],
      ((data ?? []) as never[]).map((r) => {
        const p = r as {
          students?: { first_name?: string; last_name?: string; admission_no?: string; grade?: string };
          fee_types?: { name?: string } | null; amount?: number; domain?: string; method?: string;
          bank_reference?: string; mpesa_receipt?: string; receipt_no?: string; id?: string; created_at?: string;
        };
        return [
          name(p.students ?? {}), p.students?.admission_no ?? '', p.students?.grade ?? '',
          p.fee_types?.name ?? '', Number(p.amount ?? 0).toFixed(2),
          p.domain === 'remedial' ? 'M-Pesa' : (p.method ?? ''),
          p.method === 'bank' ? (p.bank_reference ?? '') : (p.mpesa_receipt ?? ''),
          p.receipt_no ?? String(p.id ?? '').slice(0, 8),
          p.created_at ? new Date(p.created_at).toISOString() : '',
        ];
      }),
    );
  } else if (body.report === 'students') {
    const { data } = await supabase.from('students').select('admission_no,first_name,last_name,grade,status').eq('tenant_id', tid).is('deleted_at', null).order('first_name').limit(EXPORT_MAX_ROWS);
    csv = toCsv(['Admission No', 'First Name', 'Last Name', 'Grade', 'Status'], ((data ?? []) as never[]).map((r) => {
      const s = r as Record<string, string>;
      return [s.admission_no, s.first_name, s.last_name, s.grade, s.status];
    }));
  } else if (body.report === 'subjects') {
    const { data } = await supabase.from('subjects').select('name,code').eq('tenant_id', tid).order('name').limit(EXPORT_MAX_ROWS);
    csv = toCsv(['Name', 'Code'], ((data ?? []) as never[]).map((r) => {
      const s = r as Record<string, string>;
      return [s.name, s.code];
    }));
  } else if (body.report === 'teachers') {
    const { data } = await supabase.from('teachers').select('first_name,last_name,phone,teacher_type').eq('tenant_id', tid).is('deleted_at', null).order('first_name').limit(EXPORT_MAX_ROWS);
    csv = toCsv(['First Name', 'Last Name', 'Phone', 'Type'], ((data ?? []) as never[]).map((r) => {
      const t = r as Record<string, string>;
      return [t.first_name, t.last_name, t.phone, t.teacher_type];
    }));
  } else if (body.report === 'teacher-attendance') {
    const { data } = await supabase.from('teacher_attendance').select('status,marked_at,teachers(first_name,last_name)').eq('tenant_id', tid).order('marked_at', { ascending: false }).limit(EXPORT_MAX_ROWS);
    csv = toCsv(['Teacher', 'Status', 'Date'], ((data ?? []) as never[]).map((r) => {
      const a = r as { teachers?: { first_name?: string; last_name?: string }; status?: string; marked_at?: string };
      return [name(a.teachers ?? {}), a.status ?? '', a.marked_at ?? ''];
    }));
  } else {
    return badRequest('UNKNOWN_REPORT', req);
  }

  return new Response(csv, {
    status: 200,
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${body.report}.csv"` },
  });
});
