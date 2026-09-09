import { useState } from 'react';
import { useStudents, useCreateStudent } from '@/hooks/useStudents';
import { DataTable } from '@/components/DataTable';
import { Button, Input, LoadingButton } from '@/components/ui';
import { Link } from 'react-router-dom';

export default function Students() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useStudents(page, 50, search);
  const create = useCreateStudent();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ admission_no: '', first_name: '', last_name: '', grade: '' });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Students</h1>
      <div className="flex gap-2">
        <Input placeholder="Search name / admission no" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Button onClick={() => setShowNew((v) => !v)}>{showNew ? 'Cancel' : 'New student'}</Button>
      </div>
      {showNew && (
        <form
          className="grid gap-2 border p-4 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form, { onSuccess: () => setShowNew(false) });
          }}
        >
          {(['admission_no', 'first_name', 'last_name', 'grade'] as const).map((k) => (
            <Input key={k} placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required />
          ))}
          <LoadingButton loading={create.isPending}>Save</LoadingButton>
        </form>
      )}
      {isLoading ? (
        <p className="text-sm opacity-70">Loading…</p>
      ) : (
        <DataTable
          columns={['Admission', 'Name', 'Grade', 'Status', '']}
          rows={(data?.rows ?? []).map((s) => {
            const r = s as { id: string; admission_no?: string; first_name?: string; last_name?: string; grade?: string; status?: string };
            return [r.admission_no, `${r.first_name} ${r.last_name}`, r.grade, r.status, <Link key="v" to={`/admin/students/${r.id}`}>View</Link>];
          })}
        />
      )}
      <div className="flex gap-2 text-sm">
        <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <span className="p-2">Page {page} · {data?.total ?? 0} total</span>
        <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
