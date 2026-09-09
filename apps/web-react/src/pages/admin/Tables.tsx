import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { DataTable } from '@/components/DataTable';

function table(table: string, title: string, cols: string[], pick: (r: never) => (string | number | null | undefined)[]) {
  return function Table() {
    const { data: ctx } = useTenant();
    const q = useQuery({
      queryKey: [table, ctx?.tenantId],
      enabled: !!ctx?.tenantId,
      queryFn: async () => {
        const { data } = await supabase.from(table).select('*').eq('tenant_id', ctx!.tenantId).order('created_at', { ascending: false }).limit(100);
        return (data ?? []) as never[];
      },
    });
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        {q.isLoading ? <p className="text-sm opacity-70">Loading…</p> : <DataTable columns={cols} rows={q.data!.map(pick)} />}
      </div>
    );
  };
}

export const Teachers = table('teachers', 'Teachers', ['Name', 'Type', 'Phone'], (r) => {
  const x = r as unknown as { first_name?: string; last_name?: string; teacher_type?: string; phone?: string };
  return [`${x.first_name} ${x.last_name}`, x.teacher_type, x.phone];
});
export const Subjects = table('subjects', 'Subjects', ['Name', 'Code'], (r) => {
  const x = r as unknown as { name?: string; code?: string };
  return [x.name, x.code];
});
export const Classes = table('sis_classes', 'Classes', ['Name', 'Grade', 'Stream'], (r) => {
  const x = r as unknown as { name?: string; grade?: string; stream?: string };
  return [x.name, x.grade, x.stream];
});
export const Parents = table('parents', 'Parents / guardians', ['Name', 'Phone'], (r) => {
  const x = r as unknown as { first_name?: string; last_name?: string; phone?: string };
  return [`${x.first_name} ${x.last_name}`, x.phone];
});
export const Admissions = table('sis_admissions', 'Admissions', ['Name', 'Status', 'Date'], (r) => {
  const x = r as unknown as { first_name?: string; last_name?: string; status?: string; created_at?: string };
  return [`${x.first_name} ${x.last_name}`, x.status, x.created_at];
});
export const Audit = table('audit_log', 'Audit log', ['Action', 'Entity', 'Date'], (r) => {
  const x = r as unknown as { action?: string; entity?: string; created_at?: string };
  return [x.action, x.entity, x.created_at];
});
export const Announcements = table('comm_announcements', 'Announcements', ['Title', 'Date'], (r) => {
  const x = r as unknown as { title?: string; created_at?: string };
  return [x.title, x.created_at];
});
export const CommTemplates = table('comm_templates', 'Message templates', ['Name', 'Channel'], (r) => {
  const x = r as unknown as { name?: string; channel?: string };
  return [x.name, x.channel];
});
export const Expenses = table('expenses', 'Expenses', ['Description', 'Amount', 'Date'], (r) => {
  const x = r as unknown as { description?: string; amount?: number; created_at?: string };
  return [x.description, x.amount, x.created_at];
});
export const Income = table('other_income', 'Other income', ['Source', 'Amount', 'Date'], (r) => {
  const x = r as unknown as { source?: string; amount?: number; created_at?: string };
  return [x.source, x.amount, x.created_at];
});
export const Tenants = table('tenants', 'Tenants', ['Name', 'Sender ID'], (r) => {
  const x = r as unknown as { name?: string; sms_sender_id?: string };
  return [x.name, x.sms_sender_id];
});
export const Modules = table('tenant_modules', 'Modules', ['Module', 'Enabled'], (r) => {
  const x = r as unknown as { module?: string; enabled?: boolean };
  return [x.module, String(x.enabled)];
});
export const Tasks = table('teacher_tasks', 'Tasks', ['Title', 'Status', 'Due'], (r) => {
  const x = r as unknown as { title?: string; status?: string; due_at?: string };
  return [x.title, x.status, x.due_at];
});
export const Calendar = table('school_calendar_events', 'Calendar', ['Title', 'Date'], (r) => {
  const x = r as unknown as { title?: string; starts_at?: string };
  return [x.title, x.starts_at];
});
export const Discipline = table('discipline_cases', 'Discipline', ['Student', 'Status'], (r) => {
  const x = r as unknown as { student_id?: string; status?: string };
  return [x.student_id, x.status];
});
export const Lifecycle = table('student_lifecycle_events', 'Lifecycle', ['Event', 'Date'], (r) => {
  const x = r as unknown as { event?: string; created_at?: string };
  return [x.event, x.created_at];
});
export const Terms = table('terms', 'Terms', ['Name', 'Current'], (r) => {
  const x = r as unknown as { name?: string; is_current?: boolean };
  return [x.name, String(x.is_current)];
});
