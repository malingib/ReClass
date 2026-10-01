import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle,
  EmptyState, Field, Input, LoadingButton, PageHeader, StatusPill, TableSkeleton,
} from '@/components/ui';

type Row = Record<string, unknown>;
const s = (v: unknown, fb = '—') => (v === null || v === undefined || v === '' ? fb : String(v));
const fullName = (r: Row) => `${s(r.first_name, '')} ${s(r.last_name, '')}`.trim() || s(r.full_name) || s(r.admission_no);
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Best-effort tenant resolution so inserts carry tenant_id (required NOT NULL). */
async function resolveTenantId(): Promise<string | null> {
  for (const t of ['students', 'teachers', 'sis_classes', 'fee_types']) {
    try {
      const { data } = await supabase.from(t).select('tenant_id').limit(1).maybeSingle();
      const tid = (data as Row | null)?.tenant_id;
      if (tid) return String(tid);
    } catch { /* try next table */ }
  }
  return null;
}

function useStudentsBasic() {
  return useQuery({
    queryKey: ['people-students-basic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id,admission_no,first_name,last_name,grade,status')
        .is('deleted_at', null)
        .order('first_name')
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/* ================================================================
   StudentPromotion — promote students class-to-class with preview + confirm
   Route: /people/promotions
   ================================================================ */
export function StudentPromotion() {
  const qc = useQueryClient();
  const { data: students, isLoading } = useStudentsBasic();
  const [fromGrade, setFromGrade] = useState('');
  const [toGrade, setToGrade] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const grades = useMemo(
    () => [...new Set((students ?? []).map((r) => s(r.grade, 'Ungraded')))].sort(),
    [students],
  );
  const candidates = useMemo(
    () => (students ?? []).filter((r) => (!fromGrade || s(r.grade, 'Ungraded') === fromGrade) && s(r.status) === 'active'),
    [students, fromGrade],
  );
  useMemo(() => { setSelected((prev) => prev.filter((id) => candidates.some((c) => String(c.id) === id))); }, [candidates]);

  const promote = useMutation({
    mutationFn: async () => {
      if (!toGrade.trim()) throw new Error('Enter the destination class.');
      if (selected.length === 0) throw new Error('Select at least one student.');
      const { error } = await supabase.from('students').update({ grade: toGrade.trim() }).in('id', selected);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selected.length} student(s) promoted to ${toGrade.trim()}.`);
      setSelected([]);
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ['people-students-basic'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Promotion failed.'),
  });

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Student promotion" description="Move learners from one class to the next with a preview before confirming." />
      <Card>
        <CardHeader><CardTitle>Promotion filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="From class">
              <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={fromGrade} onChange={(e) => setFromGrade(e.target.value)}>
                <option value="">All classes</option>
                {grades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="To class" hint="Destination class name, e.g. Grade 5">
              <Input value={toGrade} onChange={(e) => setToGrade(e.target.value)} placeholder="Grade 5" />
            </Field>
            <Field label="Selected">
              <Input value={`${selected.length} of ${candidates.length}`} readOnly />
            </Field>
          </div>
        </CardContent>
      </Card>
      {isLoading ? <TableSkeleton /> : candidates.length === 0 ? (
        <EmptyState title="No candidates" description="No active students match this class filter." />
      ) : (
        <Card>
          <CardContent>
            <DataTable
              columns={['', 'Admission no', 'Name', 'Current class', 'Status']}
              rows={candidates.map((r) => [
                <input key={String(r.id)} type="checkbox" checked={selected.includes(String(r.id))} onChange={() => toggle(String(r.id))} aria-label={`Select ${fullName(r)}`} />,
                s(r.admission_no), fullName(r), s(r.grade, 'Ungraded'), <StatusPill key={String(r.id)} status={s(r.status)} />,
              ])}
              empty="No students found."
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setSelected(candidates.map((c) => String(c.id)))}>Select all</Button>
              <Button variant="outline" onClick={() => setSelected([])}>Clear</Button>
              <LoadingButton loading={promote.isPending} onClick={() => setConfirming(true)} disabled={selected.length === 0 || !toGrade.trim()}>
                Preview & promote ({selected.length})
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
      )}
      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setConfirming(false)}>
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold">Confirm promotion</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Move <strong>{selected.length}</strong> student(s) {fromGrade ? <>from <strong>{fromGrade}</strong> </> : null}
              to <strong>{toGrade.trim() || '—'}</strong>? This updates their class immediately.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
              <LoadingButton loading={promote.isPending} onClick={() => promote.mutate()}>Confirm promotion</LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Alumni — alumni directory (in-session records)
   Route: /people/alumni
   ================================================================ */
type Alum = { id: string; name: string; lastClass: string; year: string; contact: string };
export function Alumni() {
  const [rows, setRows] = useState<Alum[]>([]);
  const [form, setForm] = useState({ name: '', lastClass: '', year: '', contact: '' });
  const add = () => {
    if (!form.name.trim() || !form.lastClass.trim()) { toast.error('Name and last class are required.'); return; }
    setRows((p) => [{ id: uid(), ...form, name: form.name.trim(), lastClass: form.lastClass.trim() }, ...p]);
    setForm({ name: '', lastClass: '', year: '', contact: '' });
    toast.success('Alumni record added.');
  };
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Alumni" description="Graduated learners directory. Records are kept for this session." />
      <Card>
        <CardHeader><CardTitle>Add alumni</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></Field>
            <Field label="Last class"><Input value={form.lastClass} onChange={(e) => setForm({ ...form, lastClass: e.target.value })} placeholder="Grade 8" /></Field>
            <Field label="Completion year"><Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" /></Field>
            <Field label="Contact"><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Phone or email" /></Field>
          </div>
          <div className="mt-3 flex justify-end"><Button onClick={add}>Add alumni</Button></div>
        </CardContent>
      </Card>
      {rows.length === 0 ? <EmptyState title="No alumni yet" description="Add graduated learners using the form above." />
        : <Card><CardContent><DataTable columns={['Name', 'Last class', 'Year', 'Contact', '']} rows={rows.map((r) => [r.name, r.lastClass, r.year || '—', r.contact || '—',
          <Button key={r.id} variant="outline" size="sm" onClick={() => { setRows((p) => p.filter((x) => x.id !== r.id)); toast.success('Alumni record removed.'); }}>Remove</Button>])} /></CardContent></Card>}
    </div>
  );
}

/* ================================================================
   StudentDocuments — per-student document checklist + upload record
   Route: /people/documents
   ================================================================ */
const DOC_TYPES = ['Birth certificate', 'Admission letter', 'Report card', 'Medical form', 'Parent ID copy', 'Transfer letter'];
type DocRec = { id: string; studentId: string; type: string; fileName: string; receivedAt: string };
export function StudentDocuments() {
  const { data: students, isLoading } = useStudentsBasic();
  const [studentId, setStudentId] = useState('');
  const [records, setRecords] = useState<DocRec[]>(() => {
    try { return JSON.parse(localStorage.getItem('reclass-settings:student-documents') ?? '[]') as DocRec[]; } catch { return []; }
  });
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [fileName, setFileName] = useState('');
  const persist = (next: DocRec[]) => { setRecords(next); localStorage.setItem('reclass-settings:student-documents', JSON.stringify(next)); };
  const studentDocs = records.filter((r) => r.studentId === studentId);
  const missing = DOC_TYPES.filter((t) => !studentDocs.some((d) => d.type === t));
  const record = () => {
    if (!studentId) { toast.error('Select a student first.'); return; }
    if (!fileName.trim()) { toast.error('Enter the received file name.'); return; }
    persist([{ id: uid(), studentId, type: docType, fileName: fileName.trim(), receivedAt: new Date().toISOString().slice(0, 10) }, ...records]);
    setFileName('');
    toast.success('Document receipt recorded.');
  };
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Student documents" description="Track which admission documents each learner has submitted." />
      <Card>
        <CardHeader><CardTitle>Select student</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton rows={2} /> : (
            <Field label="Student">
              <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Choose a student…</option>
                {(students ?? []).map((r) => <option key={String(r.id)} value={String(r.id)}>{fullName(r)} · {s(r.admission_no)}</option>)}
              </select>
            </Field>
          )}
        </CardContent>
      </Card>
      {!studentId ? <EmptyState title="No student selected" description="Choose a student to see their document checklist." /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {DOC_TYPES.map((t) => {
                    const done = studentDocs.some((d) => d.type === t);
                    return <li key={t} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{t}</span><Badge variant={done ? 'success' : 'warning'}>{done ? 'Received' : 'Missing'}</Badge>
                    </li>;
                  })}
                </ul>
                {missing.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{missing.length} of {DOC_TYPES.length} documents outstanding.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Record receipt</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Field label="Document type">
                    <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
                      {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="File name" hint="Name of the physical or scanned file received"><Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="birth-cert-jdoe.pdf" /></Field>
                  <div className="flex justify-end"><Button onClick={record}>Record document</Button></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Received documents</CardTitle></CardHeader>
            <CardContent>
              {studentDocs.length === 0 ? <EmptyState title="Nothing recorded" description="No documents recorded for this student yet." /> : (
                <DataTable columns={['Type', 'File', 'Received', '']} rows={studentDocs.map((d) => [d.type, d.fileName, d.receivedAt,
                  <Button key={d.id} variant="outline" size="sm" onClick={() => { persist(records.filter((x) => x.id !== d.id)); toast.success('Record removed.'); }}>Remove</Button>])} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ================================================================
   StaffList — staff table (teachers) + add
   Route: /people/staff
   ================================================================ */
export function StaffList() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ first_name: '', last_name: '', employee_no: '' });
  const staffQ = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('id,first_name,last_name,employee_no,subjects').is('deleted_at', null).order('first_name').limit(300);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!form.first_name.trim() || !form.last_name.trim()) throw new Error('First and last name are required.');
      const tid = await resolveTenantId();
      if (!tid) throw new Error('Cannot determine school — staff records are not visible to this login.');
      const { error } = await supabase.from('teachers').insert({ tenant_id: tid, first_name: form.first_name.trim(), last_name: form.last_name.trim(), employee_no: form.employee_no.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Staff member added.'); setForm({ first_name: '', last_name: '', employee_no: '' }); qc.invalidateQueries({ queryKey: ['staff-list'] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Add failed.'),
  });
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Staff list" description="Teaching staff records with quick add." />
      <Card>
        <CardHeader><CardTitle>Add staff</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="First name"><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Mary" /></Field>
            <Field label="Last name"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Achieng" /></Field>
            <Field label="Employee no"><Input value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} placeholder="T-1024" /></Field>
            <div className="flex items-end"><LoadingButton loading={add.isPending} onClick={() => add.mutate()}>Add staff</LoadingButton></div>
          </div>
        </CardContent>
      </Card>
      {staffQ.isLoading ? <TableSkeleton /> : staffQ.isError ? (
        <EmptyState title="Could not load staff" description="Staff records are not accessible with this login." />
      ) : (staffQ.data ?? []).length === 0 ? (
        <EmptyState title="No staff yet" description="Add staff members using the form above." />
      ) : (
        <Card><CardContent><DataTable columns={['Name', 'Employee no', 'Subjects']} rows={(staffQ.data ?? []).map((r) => [
          fullName(r), s(r.employee_no), Array.isArray(r.subjects) ? (r.subjects.join(', ') || '—') : s(r.subjects),
        ])} /></CardContent></Card>
      )}
    </div>
  );
}

/* ================================================================
   Departments — in-session CRUD
   Route: /people/departments
   ================================================================ */
type Dept = { id: string; name: string; head: string };
export function Departments() {
  const [rows, setRows] = useState<Dept[]>([]);
  const [form, setForm] = useState({ name: '', head: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const save = () => {
    if (!form.name.trim()) { toast.error('Department name is required.'); return; }
    if (editing) {
      setRows((p) => p.map((r) => (r.id === editing ? { ...r, name: form.name.trim(), head: form.head.trim() } : r)));
      toast.success('Department updated.');
    } else {
      setRows((p) => [{ id: uid(), name: form.name.trim(), head: form.head.trim() }, ...p]);
      toast.success('Department added.');
    }
    setForm({ name: '', head: '' }); setEditing(null);
  };
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Departments" description="School departments and their heads." />
      <Card>
        <CardHeader><CardTitle>{editing ? 'Edit department' : 'Add department'}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Department name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sciences" /></Field>
            <Field label="Head of department"><Input value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} placeholder="Mr. Otieno" /></Field>
            <div className="flex items-end gap-2">
              <Button onClick={save}>{editing ? 'Update' : 'Add'}</Button>
              {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ name: '', head: '' }); }}>Cancel</Button>}
            </div>
          </div>
        </CardContent>
      </Card>
      {rows.length === 0 ? <EmptyState title="No departments" description="Add departments using the form above." />
        : <Card><CardContent><DataTable columns={['Department', 'Head', '']} rows={rows.map((r) => [r.name, r.head || '—',
          <div key={r.id} className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(r.id); setForm({ name: r.name, head: r.head }); }}>Edit</Button>
            <Button variant="outline" size="sm" onClick={() => { setRows((p) => p.filter((x) => x.id !== r.id)); toast.success('Department removed.'); }}>Delete</Button>
          </div>])} /></CardContent></Card>}
    </div>
  );
}

/* ================================================================
   Designation — in-session CRUD
   Route: /people/designations
   ================================================================ */
type Desig = { id: string; title: string; level: string };
export function Designation() {
  const [rows, setRows] = useState<Desig[]>([]);
  const [form, setForm] = useState({ title: '', level: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const save = () => {
    if (!form.title.trim()) { toast.error('Designation title is required.'); return; }
    if (editing) {
      setRows((p) => p.map((r) => (r.id === editing ? { ...r, title: form.title.trim(), level: form.level.trim() } : r)));
      toast.success('Designation updated.');
    } else {
      setRows((p) => [{ id: uid(), title: form.title.trim(), level: form.level.trim() }, ...p]);
      toast.success('Designation added.');
    }
    setForm({ title: '', level: '' }); setEditing(null);
  };
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Designations" description="Staff designations and job levels." />
      <Card>
        <CardHeader><CardTitle>{editing ? 'Edit designation' : 'Add designation'}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Teacher" /></Field>
            <Field label="Level"><Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Level 4" /></Field>
            <div className="flex items-end gap-2">
              <Button onClick={save}>{editing ? 'Update' : 'Add'}</Button>
              {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ title: '', level: '' }); }}>Cancel</Button>}
            </div>
          </div>
        </CardContent>
      </Card>
      {rows.length === 0 ? <EmptyState title="No designations" description="Add designations using the form above." />
        : <Card><CardContent><DataTable columns={['Title', 'Level', '']} rows={rows.map((r) => [r.title, r.level || '—',
          <div key={r.id} className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(r.id); setForm({ title: r.title, level: r.level }); }}>Edit</Button>
            <Button variant="outline" size="sm" onClick={() => { setRows((p) => p.filter((x) => x.id !== r.id)); toast.success('Designation removed.'); }}>Delete</Button>
          </div>])} /></CardContent></Card>}
    </div>
  );
}

/* ================================================================
   DeleteAccountRequests — request queue with approve/reject
   Route: /people/delete-requests
   ================================================================ */
type DelReq = { id: string; name: string; reason: string; requestedAt: string; status: 'pending' | 'approved' | 'rejected' };
export function DeleteAccountRequests() {
  const [rows, setRows] = useState<DelReq[]>([]);
  const [form, setForm] = useState({ name: '', reason: '' });
  const submit = () => {
    if (!form.name.trim()) { toast.error('Account name is required.'); return; }
    setRows((p) => [{ id: uid(), name: form.name.trim(), reason: form.reason.trim() || 'No reason given', requestedAt: new Date().toISOString().slice(0, 10), status: 'pending' }, ...p]);
    setForm({ name: '', reason: '' });
    toast.success('Deletion request submitted.');
  };
  const decide = (id: string, status: 'approved' | 'rejected') => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Request ${status}.`);
  };
  const pending = rows.filter((r) => r.status === 'pending').length;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Delete account requests" description={`${pending} request(s) awaiting review.`} />
      <Card>
        <CardHeader><CardTitle>New request</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Account name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="user@example.com" /></Field>
            <Field label="Reason"><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Left the school" /></Field>
            <div className="flex items-end"><Button onClick={submit}>Submit request</Button></div>
          </div>
        </CardContent>
      </Card>
      {rows.length === 0 ? <EmptyState title="No requests" description="Account deletion requests will appear here for review." /> : (
        <Card><CardContent><DataTable columns={['Account', 'Reason', 'Requested', 'Status', '']} rows={rows.map((r) => [r.name, r.reason, r.requestedAt,
          <StatusPill key={r.id} status={r.status} />,
          r.status === 'pending'
            ? <div key={r.id} className="flex gap-2">
                <Button size="sm" onClick={() => decide(r.id, 'approved')}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => decide(r.id, 'rejected')}>Reject</Button>
              </div>
            : <span key={r.id} className="text-xs text-muted-foreground">Decided</span>])} /></CardContent></Card>
      )}
    </div>
  );
}
