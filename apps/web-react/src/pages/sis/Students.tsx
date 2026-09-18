import { useState } from 'react';
import { useStudentDemographics, useStudents, useCreateStudent } from '@/hooks/useStudents';
import { DataTable } from '@/components/DataTable';
import { DemographicsChart } from '@/components/reports';
import { Button, Input, LoadingButton, PageHeader } from '@/components/ui';
import { Link } from 'react-router-dom';

export default function Students() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useStudents(page, 50, search);
  const { data: demographics } = useStudentDemographics();
  const create = useCreateStudent();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ admission_no: '', first_name: '', last_name: '', grade: '' });

  return (
    <div className="space-y-4">
      <PageHeader title="Students" description={demographics ? `${demographics.total.toLocaleString()} learners on roll.` : 'Learners on roll.'} />
      {demographics && (demographics.grade.length > 0 || demographics.status.length > 0) && (
        <DemographicsChart
          title="Learner demographics"
          description="Who is on roll right now"
          groups={[
            { title: 'Learners by grade', description: 'Class distribution', data: demographics.grade.slice(0, 8) },
            { title: 'Learners by status', description: 'Enrolment states', data: demographics.status },
          ]}
        />
      )}
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
        <>
          <DataTable
            columns={['Admission', 'Name', 'Grade', 'Status', '']}
            rows={(data?.rows ?? []).map((s) => {
              const r = s as { id: string; admission_no?: string; first_name?: string; last_name?: string; grade?: string; status?: string };
              return [r.admission_no, `${r.first_name} ${r.last_name}`, r.grade, r.status, <Link key="v" to={`/admin/students/${r.id}`} className="inline-block px-2 py-1.5">View</Link>];
            })}
            pagination="server"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} · {data?.total ?? 0} learners</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={(data?.rows ?? []).length < 50} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
