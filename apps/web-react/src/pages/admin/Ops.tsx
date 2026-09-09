import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { DataTable } from '@/components/DataTable';
import { Button, Input, LoadingButton } from '@/components/ui';

/** Port of students/import — CSV upload → batch insert with tenant scoping. */
export function StudentImport() {
  const { data: ctx } = useTenant();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(f: File) {
    setBusy(true);
    setMsg('');
    try {
      const text = await f.text();
      const lines = text.trim().split(/\r?\n/);
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((l) => {
        const cells = l.split(',').map((c) => c.trim());
        const row: Record<string, string> = { tenant_id: ctx!.tenantId! };
        headers.forEach((h, i) => {
          row[h] = cells[i] ?? '';
        });
        return row;
      });
      const { error } = await supabase.from('students').insert(rows);
      if (error) throw error;
      setMsg(`Imported ${rows.length} students.`);
    } catch (e) {
      setMsg(`Failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-xl font-semibold">Import students</h1>
      <p className="text-sm opacity-70">CSV with headers: admission_no, first_name, last_name, grade</p>
      <Input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {busy && <p className="text-sm">Importing…</p>}
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}

/** Port of admin/users — list + assign roles (user_roles is source of truth). */
export function Users() {
  const { data: ctx } = useTenant();
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('teacher');
  const q = useQuery({
    queryKey: ['user-roles', ctx?.tenantId],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('*').eq('tenant_id', ctx!.tenantId).limit(200);
      return (data ?? []) as Record<string, unknown>[];
    },
  });
  const assign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role, tenant_id: ctx!.tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      setUserId('');
      qc.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users & roles</h1>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); assign.mutate(); }}>
        <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} required />
        <select className="border p-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          {['school_admin', 'principal', 'teacher', 'bursar', 'parent'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <LoadingButton loading={assign.isPending}>Assign</LoadingButton>
      </form>
      <DataTable columns={['User', 'Role']} rows={(q.data ?? []).map((r) => [r.user_id, r.role])} />
    </div>
  );
}

/** Port of admin/settings — per-tenant sender ID + payment channels. */
export function TenantSettings() {
  const { data: ctx } = useTenant();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['tenant-settings', ctx?.tenantId],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('sms_sender_id,mpesa_paybill,kcb_account_no').eq('id', ctx!.tenantId).maybeSingle();
      return (data ?? {}) as Record<string, unknown>;
    },
  });
  const [form, setForm] = useState({ sms_sender_id: '', mpesa_paybill: '', kcb_account_no: '' });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tenants').update(form).eq('id', ctx!.tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-settings'] }),
  });
  const current = { ...(q.data ?? {}), ...Object.fromEntries(Object.entries(form).filter(([, v]) => v)) };
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-xl font-semibold">Settings</h1>
      {(['sms_sender_id', 'mpesa_paybill', 'kcb_account_no'] as const).map((k) => (
        <label key={k} className="block text-sm">{k} (current: {String(current[k] ?? '—')})
          <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={String(q.data?.[k] ?? '')} />
        </label>
      ))}
      <LoadingButton loading={save.isPending} onClick={() => save.mutate()}>Save</LoadingButton>
      {save.isSuccess && <p className="text-sm">Saved.</p>}
      <Button onClick={() => {}}>Export</Button>
    </div>
  );
}
