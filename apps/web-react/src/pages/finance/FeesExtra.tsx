import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFeeTypes } from '@/hooks/useFinance';
import {
  Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  EmptyState, Field, Input, LoadingButton, PageHeader, TableSkeleton,
} from '@/components/ui';

type Row = Record<string, unknown>;
const s = (v: unknown, fb = '—') => (v === null || v === undefined || v === '' ? fb : String(v));
const n = (v: unknown) => Number(v ?? 0) || 0;
const money = (v: unknown) => `KES ${n(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

async function resolveTenantId(): Promise<string | null> {
  for (const t of ['fee_types', 'students', 'sis_classes']) {
    try {
      const { data } = await supabase.from(t).select('tenant_id').limit(1).maybeSingle();
      const tid = (data as Row | null)?.tenant_id;
      if (tid) return String(tid);
    } catch { /* next */ }
  }
  return null;
}

/* ================================================================
   FeeStructure — structure cards + CRUD (real fee_types table)
   Route: /finance/fee-structure
   ================================================================ */
export function FeeStructure() {
  const qc = useQueryClient();
  const { data: fees, isLoading, isError } = useFeeTypes();
  const [form, setForm] = useState({ name: '', amount: '', term: '', due_date: '' });
  const [editing, setEditing] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Fee name is required.');
      if (!(n(form.amount) > 0)) throw new Error('Amount must be greater than zero.');
      if (editing) {
        const { error } = await supabase.from('fee_types').update({
          name: form.name.trim(), amount: n(form.amount), term: form.term.trim() || null, due_date: form.due_date || null,
        }).eq('id', editing);
        if (error) throw error;
      } else {
        const tid = await resolveTenantId();
        if (!tid) throw new Error('Cannot determine school — fee records are not visible to this login.');
        const { error } = await supabase.from('fee_types').insert({
          tenant_id: tid, name: form.name.trim(), amount: n(form.amount), term: form.term.trim() || null, due_date: form.due_date || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Fee updated.' : 'Fee added to structure.');
      setForm({ name: '', amount: '', term: '', due_date: '' }); setEditing(null);
      qc.invalidateQueries({ queryKey: ['fee-types'] }); qc.invalidateQueries({ queryKey: ['fee-collection'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Save failed.'),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fee_types').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Fee removed.'); qc.invalidateQueries({ queryKey: ['fee-types'] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Delete failed.'),
  });

  const total = (fees ?? []).reduce((a, f) => a + n(f.amount), 0);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Finance" title="Fee structure" description={`Per-term charges. Combined structure: ${money(total)}.`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? <TableSkeleton rows={3} /> : isError ? (
          <Card><CardContent><EmptyState title="Could not load fees" description="Fee records are not accessible with this login." /></CardContent></Card>
        ) : (fees ?? []).length === 0 ? (
          <Card><CardContent><EmptyState title="No fee items" description="Add the first fee item below." /></CardContent></Card>
        ) : (fees ?? []).map((f) => (
          <Card key={String(f.id)}>
            <CardHeader><CardTitle>{s(f.name)}</CardTitle><CardDescription>{s(f.term, 'All terms')} · due {s(f.due_date, 'no date')}</CardDescription></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{money(f.amount)}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(String(f.id)); setForm({ name: s(f.name, ''), amount: String(n(f.amount)), term: s(f.term, ''), due_date: s(f.due_date, '') }); }}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => remove.mutate(String(f.id))}>Remove</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>{editing ? 'Edit fee item' : 'Add fee item'}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-5">
            <Field label="Fee name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tuition" /></Field>
            <Field label="Amount (KES)"><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="15000" /></Field>
            <Field label="Term"><Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} placeholder="Term 1" /></Field>
            <Field label="Due date"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <div className="flex items-end gap-2">
              <LoadingButton loading={save.isPending} onClick={() => save.mutate()}>{editing ? 'Update' : 'Add fee'}</LoadingButton>
              {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ name: '', amount: '', term: '', due_date: '' }); }}>Cancel</Button>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
