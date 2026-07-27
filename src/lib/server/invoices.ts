import { countRecords, flattenStudentName } from './query';

type StudentRef = { first_name?: string | null; last_name?: string | null; admission_no?: string | null };
type InvoiceRow = {
  id: string;
  student_id?: string;
  amount_due: number;
  amount_paid?: number | null;
  status: string;
  due_date?: string | null;
  created_at?: string | null;
  students?: StudentRef | StudentRef[] | null;
};
type InvoiceFilter = <Q extends { eq(c: string, v: string): Q; not(c: string, op: string, v: string): Q }>(q: Q) => Q;

const INVOICE_SELECT = 'id, student_id, amount_due, amount_paid, status, due_date, created_at, students(first_name, last_name, admission_no)';

export async function getInvoicesByTenant(
  sb: App.Locals['srv'],
  tenantId: string,
  opts: {
    page?: number;
    pageSize?: number;
    filters?: InvoiceFilter;
    order?: { column: string; ascending?: boolean };
  } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const [{ count }, { data }] = await Promise.all([
    (() => {
      let q = sb.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
      if (opts.filters) q = opts.filters(q);
      return q;
    })(),
    (() => {
      let q = sb.from('invoices').select(INVOICE_SELECT).eq('tenant_id', tenantId);
      if (opts.filters) q = opts.filters(q);
      q = q.order(opts.order?.column ?? 'created_at', { ascending: opts.order?.ascending ?? false });
      q = q.range(offset, offset + pageSize - 1);
      return q;
    })(),
  ]);

  return { invoices: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getInvoiceCounts(sb: App.Locals['srv'], tenantId: string) {
  const [unpaid, paid, total] = await Promise.all([
    countRecords(sb, 'invoices', tenantId, q => q.eq('status', 'unpaid')),
    countRecords(sb, 'invoices', tenantId, q => q.eq('status', 'paid')),
    countRecords(sb, 'invoices', tenantId),
  ]);
  return { unpaid, paid, total };
}

export async function getUnpaidAmount(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('invoices')
    .select('amount_due, amount_paid, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'unpaid');
  return (data ?? []).reduce(
    (acc: number, row: { amount_due?: number | null; amount_paid?: number | null }) =>
      acc + Number(row.amount_due ?? 0) - Number(row.amount_paid ?? 0),
    0,
  );
}

export async function getRecentInvoices(sb: App.Locals['srv'], tenantId: string, limit: number) {
  const { data } = await sb
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((i) => ({ ...(i as InvoiceRow), ...flattenStudentName(i as InvoiceRow) }));
}

export async function getUnpaidInvoices(sb: App.Locals['srv'], tenantId: string, limit: number) {
  const { data } = await sb
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'paid')
    .not('status', 'eq', 'waived')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((inv) => ({ ...(inv as InvoiceRow), ...flattenStudentName(inv as InvoiceRow) }));
}

export async function getAgedInvoices(sb: App.Locals['srv'], tenantId: string) {
  const now = new Date();
  const { data } = await sb
    .from('invoices')
    .select('id, amount_due, amount_paid, due_date, status, created_at, students(first_name, last_name, admission_no)')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'paid')
    .not('status', 'eq', 'waived')
    .order('due_date', { ascending: true });

  const invoices = (data ?? []).map((row) => {
    const inv = row as InvoiceRow;
    const { student_name, admission_no } = flattenStudentName(inv);
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    const daysOverdue = dueDate ? Math.floor((now.getTime() - dueDate.getTime()) / 864e5) : 0;
    const bucket = daysOverdue <= 0 ? 'current'
      : daysOverdue <= 30 ? '1–30 days'
      : daysOverdue <= 60 ? '31–60 days'
      : daysOverdue <= 90 ? '61–90 days'
      : '90+ days';
    const outstanding = Number(inv.amount_due) - Number(inv.amount_paid ?? 0);
    return {
      id: inv.id,
      student_name,
      admission_no,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid ?? 0,
      outstanding,
      due_date: inv.due_date,
      daysOverdue: Math.max(0, daysOverdue),
      bucket,
      status: inv.status,
    };
  });

  const buckets: Record<string, number> = {
    current: 0,
    '1–30 days': 0,
    '31–60 days': 0,
    '61–90 days': 0,
    '90+ days': 0,
  };
  for (const inv of invoices) {
    buckets[inv.bucket] = (buckets[inv.bucket] ?? 0) + inv.outstanding;
  }
  const totalOutstanding = Object.values(buckets).reduce((s, v) => s + v, 0);

  return { aging: invoices, buckets, totalOutstanding };
}

export async function getRevenueSum(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('invoices')
    .select('amount_paid')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid');
  return (data ?? []).reduce(
    (sum: number, r: { amount_paid?: number | null }) => sum + Number(r.amount_paid),
    0,
  );
}
