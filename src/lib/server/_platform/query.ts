import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';

type Srv = SupabaseClient<Database>;
type TableName = keyof Database['public']['Tables'];

// supabase-js cannot resolve a query builder when the table name is a runtime
// union (keyof Tables) — it collapses to `never` and triggers "excessively deep"
// instantiation. These helpers accept a fully-typed client for caller safety,
// then build the dynamic-table query through a minimal structural view. Row
// shapes are recovered via the <T> return generic — no `any` anywhere.
interface LooseResult {
  data: unknown;
  count: number | null;
  error: unknown;
}
interface LooseBuilder extends PromiseLike<LooseResult> {
  select(sel: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): LooseBuilder;
  eq(col: string, val: unknown): LooseBuilder;
  in(col: string, vals: readonly unknown[]): LooseBuilder;
  not(col: string, op: string, val: unknown): LooseBuilder;
  gte(col: string, val: unknown): LooseBuilder;
  lte(col: string, val: unknown): LooseBuilder;
  or(filters: string): LooseBuilder;
  is(col: string, val: unknown): LooseBuilder;
  order(col: string, opts?: { ascending?: boolean }): LooseBuilder;
  range(from: number, to: number): LooseBuilder;
}
interface LooseClient {
  from(table: string): LooseBuilder;
  rpc(name: string, params?: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

type Filter = (q: LooseBuilder) => LooseBuilder;

const loose = (sb: Srv): LooseClient => sb as unknown as LooseClient;

export function withTenant<Q extends { eq(col: string, val: string): Q }>(
  q: Q,
  tenantId: string | undefined,
): Q {
  if (tenantId) return q.eq('tenant_id', tenantId);
  return q;
}

export function tenantFilter(tenantId: string) {
  return <Q extends { eq(col: string, val: string): Q }>(q: Q): Q => q.eq('tenant_id', tenantId);
}

export async function countRecordsDistinct(
  sb: App.Locals['srv'],
  table: TableName,
  tenantId: string,
  column: string,
): Promise<number> {
  const { count } = await loose(sb)
    .from(table)
    .select(`${column}`, { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  return count ?? 0;
}

export async function countRecords(
  sb: Srv,
  table: TableName,
  tenantId: string,
  filters?: Filter,
): Promise<number> {
  let q = loose(sb).from(table).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
  if (filters) q = filters(q);
  const { count } = await q;
  return count ?? 0;
}

export async function paginatedQuery<T>(
  sb: Srv,
  table: TableName,
  tenantId: string,
  opts: {
    select: string;
    order?: { column: string; ascending?: boolean };
    page?: number;
    pageSize?: number;
    filters?: Filter;
    search?: { term: string; columns: string[] };
  },
): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;
  const client = loose(sb);

  // Build a case-insensitive OR filter across the searchable columns.
  const searchExpr = opts.search?.term?.trim()
    ? opts.search.columns.map((c) => `${c}.ilike.%${opts.search!.term.trim().replace(/[,()]/g, '').replace(/%/g, '\\%')}%`).join(',')
    : null;

  const [{ count }, { data }] = await Promise.all([
    (() => {
      let q = client.from(table).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
      if (opts.filters) q = opts.filters(q);
      if (searchExpr) q = q.or(searchExpr);
      return q;
    })(),
    (() => {
      let q = client.from(table).select(opts.select).eq('tenant_id', tenantId);
      if (opts.filters) q = opts.filters(q);
      if (searchExpr) q = q.or(searchExpr);
      if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? false });
      q = q.range(offset, offset + pageSize - 1);
      return q;
    })(),
  ]);

  return { data: (data ?? []) as T[], total: count ?? 0, page, pageSize };
}

export async function rpc<T = unknown>(
  sb: Srv,
  name: string,
  params: Record<string, unknown>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  const { data, error } = await loose(sb).rpc(name, params);
  return { data: (data ?? null) as T | null, error: (error as { message: string } | null) ?? null };
}

type StudentRef = { first_name?: string | null; last_name?: string | null; admission_no?: string | null };

export function flattenStudentName(
  row: { students?: StudentRef | StudentRef[] | null },
): { student_name: string; admission_no: string } {
  const s = Array.isArray(row.students) ? row.students[0] : row.students;
  return {
    student_name: s ? `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown' : 'Unknown',
    admission_no: s?.admission_no ?? '—',
  };
}
