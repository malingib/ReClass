import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader, Pagination, StatusPill } from '@/components/ui';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  GraduationCap,
  UserCheck,
  ClipboardList,
  DollarSign,
  TrendingUp,
  ListTodo,
  Calendar as CalendarIcon,
  ShieldAlert,
  GitBranch,
  Clock,
  Puzzle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { dateKE } from '@/lib/format';

type TableConfig = {
  tableName: string;
  title: string;
  description: string;
  columns: string[];
  pick: (r: never, index: number) => (string | number | ReactNode | null | undefined)[];
  icon: React.ComponentType<{ className?: string }>;
};

const PAGE_SIZE = 20;

function table(config: TableConfig) {
  const { tableName, title, description, columns, pick, icon: Icon } = config;

  return function Table() {
    const [page, setPage] = useState(1);
    const q = useQuery({
      queryKey: [tableName],
      queryFn: async () => {
        const { data, error } = await supabase.from(tableName).select('*').limit(100);
        if (error) throw error;
        return (data ?? []) as never[];
      },
    });

    const rows = q.data ?? [];
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
      <div className="space-y-6">
        <PageHeader eyebrow="School operations" title={title} description={description} />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              <CardTitle>{title} register</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {q.isLoading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading {title.toLowerCase()}…
              </div>
            ) : q.isError ? (
              <div className="space-y-3 p-6 text-sm">
                <p className="text-destructive">Unable to load {title.toLowerCase()}. Please try again.</p>
                <Button variant="outline" size="sm" onClick={() => q.refetch()}>Retry</Button>
              </div>
            ) : (
              <>
                <DataTable
                  columns={columns}
                  rows={pageRows.map((r, i) => pick(r, (safePage - 1) * PAGE_SIZE + i))}
                  empty={`No ${title.toLowerCase()} records yet.`}
                />
                {totalPages > 1 && (
                  <div className="border-t px-4 py-3">
                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      total={rows.length}
                      label="records"
                      onPrev={() => setPage(safePage - 1)}
                      onNext={() => setPage(safePage + 1)}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
}

export const Teachers = table({
  tableName: 'teachers',
  title: 'Teachers',
  description: 'View and manage all teaching staff and their assignments.',
  icon: Users,
  columns: ['Name', 'Employee No', 'Subjects', 'Phone'],
  pick: (r) => {
    const x = r as unknown as {
      first_name?: string;
      last_name?: string;
      employee_no?: string;
      subjects?: string[];
      phone?: string;
    };
    const name = `${x.first_name ?? ''} ${x.last_name ?? ''}`.trim();
    return [
      name || '—',
      x.employee_no ?? '—',
      x.subjects && x.subjects.length > 0 ? x.subjects.join(', ') : '—',
      x.phone ?? '—',
    ];
  },
});

export const Subjects = table({
  tableName: 'subjects',
  title: 'Subjects',
  description: 'Curriculum subjects offered at the school.',
  icon: BookOpen,
  columns: ['Name', 'Code'],
  pick: (r) => {
    const x = r as unknown as { name?: string; code?: string };
    return [x.name ?? '—', x.code ?? '—'];
  },
});

export const Classes = table({
  tableName: 'sis_classes',
  title: 'Classes',
  description: 'All classes, grades, and streams.',
  icon: GraduationCap,
  columns: ['Name', 'Code', 'Stream', 'Academic Year', 'Status'],
  pick: (r, i) => {
    const x = r as unknown as { name?: string; code?: string; stream?: string; academic_year?: string; status?: string };
    return [
      x.name ?? '—',
      x.code ?? '—',
      x.stream ?? '—',
      x.academic_year ?? '—',
      x.status ? <StatusPill key={`cls-${i}`} status={x.status} /> : '—',
    ];
  },
});

export const Parents = table({
  tableName: 'parents',
  title: 'Parents / Guardians',
  description: 'Parent and guardian contact records linked to students.',
  icon: UserCheck,
  columns: ['Name', 'Phone', 'Email'],
  pick: (r) => {
    const x = r as unknown as {
      full_name?: string;
      phone?: string;
      email?: string;
    };
    return [x.full_name ?? '—', x.phone ?? '—', x.email ?? '—'];
  },
});

export const Admissions = table({
  tableName: 'sis_admissions',
  title: 'Admissions',
  description: 'New student admission applications and their status.',
  icon: ClipboardList,
  columns: ['Admission No', 'Grade Applied', 'Status', 'Date', ''],
  pick: (r, i) => {
    const x = r as unknown as {
      admission_number?: string;
      grade_applied?: string;
      status?: string;
      admission_date?: string;
      created_at?: string;
      student_id?: string;
    };
    return [
      x.admission_number ?? '—',
      x.grade_applied ?? '—',
      x.status ? <StatusPill key={`adm-${i}`} status={x.status} /> : '—',
      x.admission_date ? dateKE(x.admission_date) : x.created_at ? dateKE(x.created_at) : '—',
      x.student_id ? (
        <Link key={`admv-${i}`} to={`/admin/students/${x.student_id}`} className="text-sm font-medium text-primary hover:underline">
          View
        </Link>
      ) : null,
    ];
  },
});

export const Audit = table({
  tableName: 'audit_log',
  title: 'Audit Log',
  description: 'System activity trail for compliance and accountability.',
  icon: ShieldAlert,
  columns: ['Action', 'Entity', 'User', 'Date'],
  pick: (r, i) => {
    const x = r as unknown as {
      action?: string;
      entity?: string;
      actor_id?: string;
      created_at?: string;
    };
    return [
      x.action ? <StatusPill key={`al-${i}`} status={x.action} /> : '—',
      x.entity ?? '—',
      x.actor_id ?? '—',
      x.created_at ? dateKE(x.created_at) : '—',
    ];
  },
});

export const Expenses = table({
  tableName: 'expenses',
  title: 'Expenses',
  description: 'Recorded school expenses and operational costs.',
  icon: DollarSign,
  columns: ['Description', 'Category', 'Amount', 'Status', 'Date'],
  pick: (r, i) => {
    const x = r as unknown as {
      description?: string;
      category?: string;
      amount?: number;
      status?: string;
      created_at?: string;
    };
    return [
      x.description ?? '—',
      x.category ?? '—',
      <span key={`exp-${i}`} className="font-medium tabular-nums">
        KES {Number(x.amount ?? 0).toLocaleString()}
      </span>,
      x.status ? <StatusPill key={`exps-${i}`} status={x.status} /> : '—',
      x.created_at ? dateKE(x.created_at) : '—',
    ];
  },
});

export const Income = table({
  tableName: 'other_income',
  title: 'Other Income',
  description: 'Non-fee income sources recorded for the school.',
  icon: TrendingUp,
  columns: ['Source', 'Description', 'Amount', 'Date'],
  pick: (r, i) => {
    const x = r as unknown as {
      source?: string;
      description?: string;
      amount?: number;
      created_at?: string;
    };
    return [
      x.source ?? '—',
      x.description ?? '—',
      <span key={`inc-${i}`} className="font-medium tabular-nums">
        KES {Number(x.amount ?? 0).toLocaleString()}
      </span>,
      x.created_at ? dateKE(x.created_at) : '—',
    ];
  },
});

export const Tasks = table({
  tableName: 'teacher_tasks',
  title: 'Tasks',
  description: 'Assigned tasks for teachers and staff.',
  icon: ListTodo,
  columns: ['Title', 'Priority', 'Status', 'Due Date'],
  pick: (r, i) => {
    const x = r as unknown as {
      title?: string;
      priority?: string;
      status?: string;
      due_at?: string;
    };
    return [
      x.title ?? '—',
      x.priority ? (
        <span key={`prio-${i}`} className="font-medium capitalize text-muted-foreground">
          {x.priority}
        </span>
      ) : '—',
      x.status ? <StatusPill key={`task-${i}`} status={x.status} /> : '—',
      x.due_at ? dateKE(x.due_at) : '—',
    ];
  },
});

export const Calendar = table({
  tableName: 'school_calendar_events',
  title: 'School Calendar',
  description: 'Upcoming events, holidays, and important school dates.',
  icon: CalendarIcon,
  columns: ['Title', 'Type', 'Start', 'End'],
  pick: (r) => {
    const x = r as unknown as {
      title?: string;
      event_type?: string;
      starts_at?: string;
      ends_at?: string;
    };
    return [
      x.title ?? '—',
      x.event_type ? (
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {x.event_type}
        </span>
      ) : '—',
      x.starts_at ? dateKE(x.starts_at) : '—',
      x.ends_at ? dateKE(x.ends_at) : '—',
    ];
  },
});

export const Discipline = table({
  tableName: 'discipline_cases',
  title: 'Discipline',
  description: 'Student discipline cases and incident records.',
  icon: ShieldAlert,
  columns: ['Student ID', 'Category', 'Severity', 'Status', 'Date'],
  pick: (r, i) => {
    const x = r as unknown as {
      student_id?: string;
      category?: string;
      severity?: string;
      status?: string;
      created_at?: string;
    };
    return [
      x.student_id ?? '—',
      x.category ?? '—',
      x.severity ? (
        <span className="font-medium capitalize text-muted-foreground">
          {x.severity}
        </span>
      ) : '—',
      x.status ? <StatusPill key={`disc-${i}`} status={x.status} /> : '—',
      x.created_at ? dateKE(x.created_at) : '—',
    ];
  },
});

export const Lifecycle = table({
  tableName: 'student_lifecycle_events',
  title: 'Student Lifecycle',
  description: 'Track student lifecycle events like promotions, transfers, and withdrawals.',
  icon: GitBranch,
  columns: ['Event', 'Student ID', 'Notes', 'Date'],
  pick: (r) => {
    const x = r as unknown as {
      event_type?: string;
      student_id?: string;
      notes?: string;
      event_date?: string;
    };
    return [
      x.event_type ? (
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {x.event_type}
        </span>
      ) : '—',
      x.student_id ?? '—',
      x.notes ?? '—',
      x.event_date ? dateKE(x.event_date) : '—',
    ];
  },
});

export const Terms = table({
  tableName: 'terms',
  title: 'Terms',
  description: 'Academic terms and session periods.',
  icon: Clock,
  columns: ['Name', 'Start Date', 'End Date', 'Status'],
  pick: (r) => {
    const x = r as unknown as {
      name?: string;
      start_date?: string;
      end_date?: string;
      is_current?: boolean;
    };
    return [
      x.name ?? '—',
      x.start_date ? dateKE(x.start_date) : '—',
      x.end_date ? dateKE(x.end_date) : '—',
      x.is_current ? (
        <span className="inline-flex items-center rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-xs font-medium text-success-foreground">
          Current
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    ];
  },
});

export const Modules = table({
  tableName: 'modules',
  title: 'Modules',
  description: 'System modules and feature toggles.',
  icon: Puzzle,
  columns: ['Name', 'Key', 'Status'],
  pick: (r, i) => {
    const x = r as unknown as {
      name?: string;
      key?: string;
      slug?: string;
      active?: boolean;
    };
    return [
      x.name ?? '—',
      <code key={`mod-${i}`} className="rounded bg-muted px-1.5 py-0.5 text-xs">
        {x.key ?? x.slug ?? '—'}
      </code>,
      x.active === false ? (
        <StatusPill key={`mods-${i}`} status="inactive" />
      ) : (
        <StatusPill key={`mods-${i}`} status="active" />
      ),
    ];
  },
});
