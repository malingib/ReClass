import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingButton } from '@/components/ui';

export function StudentImport() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function onFile(f: File) {
    setBusy(true); setMsg('');
    try {
      const text = await f.text();
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV must contain a header and at least one row.');
      const headers = lines[0].split(',').map((h) => h.trim()).filter(Boolean);
      const rows = lines.slice(1).map((l) => {
        const cells = l.split(',').map((c) => c.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
        return row;
      });
      const { error } = await supabase.from('students').insert(rows);
      if (error) throw error;
      setMsg(`Imported ${rows.length} students successfully.`);
    } catch (e) { setMsg(`Import failed: ${(e as Error).message}`); } finally { setBusy(false); }
  }
  return <div className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-wide text-primary">SIS</p><h1 className="mt-1 text-2xl font-semibold">Import students</h1><p className="mt-1 text-sm text-muted-foreground">Upload a CSV containing admission_no, first_name, last_name and grade.</p></header><Card><CardHeader><CardTitle>CSV import</CardTitle></CardHeader><CardContent className="space-y-3"><Input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />{busy && <p className="text-sm text-muted-foreground">Importing records…</p>}{msg && <p className="text-sm">{msg}</p>}</CardContent></Card></div>;
}

export function Users() {
  const qc = useQueryClient(); const [userId, setUserId] = useState(''); const [role, setRole] = useState('teacher');
  const q = useQuery({ queryKey: ['user-roles'], queryFn: async () => { const { data, error } = await supabase.from('user_roles').select('*').limit(200); if (error) throw error; return (data ?? []) as Record<string, unknown>[]; } });
  const assign = useMutation({ mutationFn: async () => { if (!userId.trim()) throw new Error('Enter a user ID.'); const { error } = await supabase.from('user_roles').insert({ user_id: userId.trim(), role }); if (error) throw error; }, onSuccess: () => { setUserId(''); void qc.invalidateQueries({ queryKey: ['user-roles'] }); } });
  return <div className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-wide text-primary">Administration</p><h1 className="mt-1 text-2xl font-semibold">Users & roles</h1><p className="mt-1 text-sm text-muted-foreground">Assign school roles and review current access.</p></header><Card><CardContent className="flex flex-col gap-2 p-4 sm:flex-row"><Input className="sm:max-w-md" placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} /><select className="h-9 rounded-md border bg-background px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>{['school_admin','principal','teacher','remedial_teacher','bursar','payroll','parent'].map((r) => <option key={r}>{r}</option>)}</select><LoadingButton loading={assign.isPending} onClick={() => assign.mutate()}>Assign role</LoadingButton></CardContent></Card>{assign.isError && <p className="text-sm text-destructive">{(assign.error as Error).message}</p>}<DataTable columns={['User','Role']} rows={(q.data ?? []).map((r) => [r.user_id, r.role])} empty="No school roles found." /></div>;
}

export function SchoolSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['school-settings'], queryFn: async () => { const { data, error } = await supabase.from('school_settings').select('sms_sender_id,mpesa_paybill,kcb_account_no').eq('id', 1).maybeSingle(); if (error) throw error; return (data ?? {}) as Record<string, unknown>; } });
  const [form, setForm] = useState({ sms_sender_id: '', mpesa_paybill: '', kcb_account_no: '' });
  const current = { ...(q.data ?? {}), ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '')) };
  const save = useMutation({ mutationFn: async () => { const { error } = await supabase.from('school_settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', 1); if (error) throw error; }, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['school-settings'] }); } });
  return <div className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-wide text-primary">Administration</p><h1 className="mt-1 text-2xl font-semibold">School settings</h1><p className="mt-1 text-sm text-muted-foreground">Configure school communication and payment identifiers.</p></header><Card><CardHeader><CardTitle>School configuration</CardTitle></CardHeader><CardContent className="space-y-4">{(['sms_sender_id','mpesa_paybill','kcb_account_no'] as const).map((key) => <label key={key} className="block space-y-1 text-sm"><span className="font-medium">{key.replaceAll('_',' ')}</span><span className="block text-xs text-muted-foreground">Current: {String(current[key] ?? '—')}</span><Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={String(q.data?.[key] ?? '')} /></label>)}<LoadingButton loading={save.isPending} onClick={() => save.mutate()}>Save settings</LoadingButton>{save.isError && <p className="text-sm text-destructive">{(save.error as Error).message}</p>}{save.isSuccess && <p className="text-sm text-success">Settings saved.</p>}</CardContent></Card></div>;
}

export const TenantSettings = SchoolSettings;
