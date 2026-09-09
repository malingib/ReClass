import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, UserPlus, UserRoundCheck, UserRoundX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingButton } from '@/components/ui';
import { DataTable } from '@/components/DataTable';

const ROLE_OPTIONS = [
  { name: 'ReClass Chair', description: 'Committee leadership and oversight.' },
  { name: 'ReClass Secretary', description: 'Records, appointments and follow-up.' },
  { name: 'ReClass Treasurer', description: 'ReClass financial and payment controls.' },
  { name: 'ReClass Committee Member', description: 'Committee participation and review.' },
] as const;

const roleLabel = (value: string) => value || '—';
const dateLabel = (value: unknown) => {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

type Profile = { id: string; full_name: string | null; phone: string | null };
type RoleDefinition = { id: string; name: string; description: string | null; active: boolean };
type Assignment = {
  id: string;
  profile_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
  active: boolean;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  profile?: Profile | null;
  role?: RoleDefinition | null;
};

export default function CommitteeManagement() {
  const qc = useQueryClient();
  const [profileId, setProfileId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState('');
  const [notes, setNotes] = useState('');

  const profiles = useQuery({
    queryKey: ['reclass-committee-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id,full_name,phone').order('full_name').limit(500);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const roles = useQuery({
    queryKey: ['reclass-committee-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('reclass_committee_roles').select('id,name,description,active').eq('active', true).order('name');
      if (error) throw error;
      return (data ?? []) as RoleDefinition[];
    },
  });

  const assignments = useQuery({
    queryKey: ['reclass-committee-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reclass_committee_assignments')
        .select('id,profile_id,role_id,assigned_at,assigned_by,active,effective_from,effective_to,notes,profile:profiles!reclass_committee_assignments_profile_id_fkey(id,full_name,phone),role:reclass_committee_roles!reclass_committee_assignments_role_id_fkey(id,name,description,active)')
        .order('active', { ascending: false })
        .order('effective_from', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });

  const roleByName = useMemo(() => new Map((roles.data ?? []).map((r) => [r.name, r])), [roles.data]);

  const assign = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error('Select a committee member.');
      if (!roleId) throw new Error('Select a committee role.');
      if (effectiveTo && effectiveTo < effectiveFrom) throw new Error('End date cannot be before the effective date.');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('reclass_committee_assignments').insert({
        profile_id: profileId,
        role_id: roleId,
        assigned_by: auth.user?.id ?? null,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        notes: notes.trim() || null,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setProfileId('');
      setRoleId('');
      setEffectiveTo('');
      setNotes('');
      void qc.invalidateQueries({ queryKey: ['reclass-committee-assignments'] });
    },
  });

  const endAssignment = useMutation({
    mutationFn: async (assignment: Assignment) => {
      const { error } = await supabase.from('reclass_committee_assignments').update({ active: false, effective_to: new Date().toISOString().slice(0, 10) }).eq('id', assignment.id).eq('active', true);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reclass-committee-assignments'] }),
  });

  const rows = (assignments.data ?? []).map((a) => [
    a.profile?.full_name || a.profile_id,
    roleLabel(a.role?.name ?? ''),
    a.active ? 'Active' : 'Ended',
    dateLabel(a.effective_from),
    dateLabel(a.effective_to),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">ReClass administration</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Committee management</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Appoint committee members, assign the four ReClass committee offices, keep effective dates, and end assignments without deleting the audit history.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-4" /> New appointment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1 text-sm"><span className="font-medium">Committee member</span><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={profileId} onChange={(e) => setProfileId(e.target.value)}><option value="">Select a user</option>{(profiles.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.id}{p.phone ? ` · ${p.phone}` : ''}</option>)}</select></label>
            <label className="block space-y-1 text-sm"><span className="font-medium">Committee role</span><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={roleId} onChange={(e) => setRoleId(e.target.value)}><option value="">Select a role</option>{(roles.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm"><span className="font-medium">Effective from</span><Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></label>
              <label className="block space-y-1 text-sm"><span className="font-medium">Effective to</span><Input type="date" value={effectiveTo} min={effectiveFrom} onChange={(e) => setEffectiveTo(e.target.value)} /></label>
            </div>
            <label className="block space-y-1 text-sm"><span className="font-medium">Appointment note</span><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional reason or committee note" /></label>
            {assign.isError && <p className="text-sm text-destructive">{(assign.error as Error).message}</p>}
            {assign.isSuccess && <p className="text-sm text-success">Committee appointment saved.</p>}
            <LoadingButton loading={assign.isPending} onClick={() => assign.mutate()}>Appoint member</LoadingButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserRoundCheck className="size-4" /> Committee offices</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ROLE_OPTIONS.map((option) => {
              const definition = roleByName.get(option.name);
              const holder = (assignments.data ?? []).find((a) => a.active && a.role_id === definition?.id);
              return <div key={option.name} className="rounded-md border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{option.name}</p><p className="text-xs text-muted-foreground">{option.description}</p></div><span className="text-xs text-muted-foreground">{holder ? holder.profile?.full_name || holder.profile_id : 'Vacant'}</span></div></div>;
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-4" /> Membership register</CardTitle></CardHeader>
        <CardContent className="p-0">
          {assignments.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading committee appointments…</div> : assignments.isError ? <div className="p-6 text-sm text-destructive">Unable to load committee appointments.</div> : <>
            <DataTable columns={['Member','Role','Status','Effective from','Effective to']} rows={rows} empty="No committee appointments found." />
            {(assignments.data ?? []).some((a) => a.active) && <div className="space-y-2 border-t p-4">{(assignments.data ?? []).filter((a) => a.active).map((a) => <div key={a.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{a.profile?.full_name || a.profile_id}</p><p className="text-xs text-muted-foreground">{a.role?.name || '—'} · effective {dateLabel(a.effective_from)}</p>{a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}</div><Button variant="outline" disabled={endAssignment.isPending} onClick={() => endAssignment.mutate(a)}><UserRoundX className="mr-2 size-4" />End assignment</Button></div>)}</div>}
          </>}
        </CardContent>
      </Card>
    </div>
  );
}
