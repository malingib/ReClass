import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

function table(tableName: string, title: string, cols: string[], pick: (r: never) => (string | number | null | undefined)[]) {
  return function Table() {
    const q = useQuery({
      queryKey: [tableName],
      queryFn: async () => {
        const { data, error } = await supabase.from(tableName).select('*').limit(100);
        if (error) throw error;
        return (data ?? []) as never[];
      },
    });
    return (
      <div className="space-y-6">
        <header><p className="text-xs font-semibold uppercase tracking-wide text-primary">School operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">Review and manage school records.</p></header>
        <Card><CardHeader><CardTitle>{title} register</CardTitle></CardHeader><CardContent className="p-0">
          {q.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading {title.toLowerCase()}…</div> : q.isError ? <div className="p-6 text-sm text-destructive">Unable to load {title.toLowerCase()}. Please try again.</div> : <DataTable columns={cols} rows={(q.data ?? []).map(pick)} empty={`No ${title.toLowerCase()} records yet.`} />}
        </CardContent></Card>
      </div>
    );
  };
}

export const Teachers = table('teachers', 'Teachers', ['Name', 'Type', 'Phone'], (r) => { const x = r as unknown as { first_name?: string; last_name?: string; teacher_type?: string; phone?: string }; return [`${x.first_name ?? ''} ${x.last_name ?? ''}`.trim(), x.teacher_type, x.phone]; });
export const Subjects = table('subjects', 'Subjects', ['Name', 'Code'], (r) => { const x = r as unknown as { name?: string; code?: string }; return [x.name, x.code]; });
export const Classes = table('sis_classes', 'Classes', ['Name', 'Grade', 'Stream'], (r) => { const x = r as unknown as { name?: string; grade?: string; stream?: string }; return [x.name, x.grade, x.stream]; });
export const Parents = table('parents', 'Parents / guardians', ['Name', 'Phone'], (r) => { const x = r as unknown as { first_name?: string; last_name?: string; phone?: string }; return [`${x.first_name ?? ''} ${x.last_name ?? ''}`.trim(), x.phone]; });
export const Admissions = table('sis_admissions', 'Admissions', ['Name', 'Status', 'Date'], (r) => { const x = r as unknown as { first_name?: string; last_name?: string; status?: string; created_at?: string }; return [`${x.first_name ?? ''} ${x.last_name ?? ''}`.trim(), x.status, x.created_at]; });
export const Audit = table('audit_log', 'Audit log', ['Action', 'Entity', 'Date'], (r) => { const x = r as unknown as { action?: string; entity?: string; created_at?: string }; return [x.action, x.entity, x.created_at]; });
export const Announcements = table('comm_announcements', 'Announcements', ['Title', 'Date'], (r) => { const x = r as unknown as { title?: string; created_at?: string }; return [x.title, x.created_at]; });
export const CommTemplates = table('comm_templates', 'Message templates', ['Name', 'Channel'], (r) => { const x = r as unknown as { name?: string; channel?: string }; return [x.name, x.channel]; });
export const Expenses = table('expenses', 'Expenses', ['Description', 'Amount', 'Date'], (r) => { const x = r as unknown as { description?: string; amount?: number; created_at?: string }; return [x.description, x.amount, x.created_at]; });
export const Income = table('other_income', 'Other income', ['Source', 'Amount', 'Date'], (r) => { const x = r as unknown as { source?: string; amount?: number; created_at?: string }; return [x.source, x.amount, x.created_at]; });
export const Tasks = table('teacher_tasks', 'Tasks', ['Title', 'Status', 'Due'], (r) => { const x = r as unknown as { title?: string; status?: string; due_at?: string }; return [x.title, x.status, x.due_at]; });
export const Calendar = table('school_calendar_events', 'Calendar', ['Title', 'Date'], (r) => { const x = r as unknown as { title?: string; starts_at?: string }; return [x.title, x.starts_at]; });
export const Discipline = table('discipline_cases', 'Discipline', ['Student', 'Status'], (r) => { const x = r as unknown as { student_id?: string; status?: string }; return [x.student_id, x.status]; });
export const Lifecycle = table('student_lifecycle_events', 'Lifecycle', ['Event', 'Date'], (r) => { const x = r as unknown as { event?: string; created_at?: string }; return [x.event, x.created_at]; });
export const Terms = table('terms', 'Terms', ['Name', 'Current'], (r) => { const x = r as unknown as { name?: string; is_current?: boolean }; return [x.name, x.is_current ? 'Current' : '—']; });
