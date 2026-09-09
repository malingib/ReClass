import { useParams } from 'react-router-dom';
import { useStudent } from '@/hooks/useStudents';
import { DataTable } from '@/components/DataTable';
import { Card } from '@/components/ui';

export default function StudentDetails() {
  const { id = '' } = useParams();
  const { data, isLoading } = useStudent(id);
  if (isLoading) return <p className="p-8 text-sm opacity-70">Loading…</p>;
  const s = (data?.student ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{String(s.first_name ?? '')} {String(s.last_name ?? '')}</h1>
      <Card>
        <dl className="grid gap-1 text-sm md:grid-cols-2">
          {['admission_no', 'grade', 'status', 'gender', 'date_of_birth'].map((k) => (
            <div key={k} className="flex gap-2"><dt className="opacity-70">{k}:</dt><dd>{String(s[k] ?? '—')}</dd></div>
          ))}
        </dl>
      </Card>
      <h2 className="font-medium">Enrollments</h2>
      <DataTable columns={['Class', 'Status', 'Term']} rows={(data?.enrollments ?? []).map((e) => {
        const r = e as { class_id?: string; status?: string; term?: string };
        return [r.class_id, r.status, r.term];
      })} />
      <h2 className="font-medium">Invoices</h2>
      <DataTable columns={['Amount due', 'Paid', 'Status']} rows={(data?.invoices ?? []).map((i) => {
        const r = i as { amount_due?: number; amount_paid?: number; status?: string };
        return [r.amount_due, r.amount_paid, r.status];
      })} />
      <h2 className="font-medium">Recent payments</h2>
      <DataTable columns={['Amount', 'Method', 'Status', 'Date']} rows={(data?.payments ?? []).map((p) => {
        const r = p as { amount?: number; method?: string; status?: string; created_at?: string };
        return [r.amount, r.method, r.status, r.created_at];
      })} />
    </div>
  );
}
