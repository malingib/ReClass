import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

const ROUTE_GUIDANCE: Record<string, { description: string; links: { label: string; to: string }[] }> = {
  Enrollment: {
    description: 'Manage active enrolment, class placement and student lifecycle changes from the SIS.',
    links: [{ label: 'Open SIS', to: '/admin/sis' }, { label: 'Admissions', to: '/admin/admissions' }],
  },
  Graduation: { description: 'Review graduating learners and their completion status.', links: [{ label: 'Open SIS', to: '/admin/sis' }] },
  Retention: { description: 'Review student retention and lifecycle activity.', links: [{ label: 'Lifecycle', to: '/admin/operations/lifecycle' }, { label: 'Students', to: '/admin/students' }] },
  Lessons: { description: 'Coordinate teaching work, classes and scheduled activities.', links: [{ label: 'Teacher tasks', to: '/teacher/tasks' }, { label: 'Calendar', to: '/admin/calendar' }] },
  Operations: { description: 'Use the operational workspace to coordinate school activity and follow-ups.', links: [{ label: 'Calendar', to: '/admin/operations/calendar' }, { label: 'Tasks', to: '/admin/operations/tasks' }, { label: 'Discipline', to: '/admin/operations/discipline' }] },
  'Not found': { description: 'The requested route does not exist in this school workspace.', links: [{ label: 'Go to dashboard', to: '/admin' }] },
};

export function Stub({ title }: { title: string }) {
  const guidance = ROUTE_GUIDANCE[title] ?? { description: 'This workspace is available in the application navigation.', links: [{ label: 'Dashboard', to: '/admin' }] };
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">eShule workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{guidance.description}</p>
      </header>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="rounded-md bg-primary/10 p-2 text-primary"><ClipboardList className="size-4" /></div>
          <div><CardTitle>Workspace navigation</CardTitle><p className="mt-1 text-xs text-muted-foreground">Continue with the operational surface that matches this workflow.</p></div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {guidance.links.map((link) => <Link key={link.to} to={link.to} className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">{link.label}<ArrowRight className="size-4" /></Link>)}
        </CardContent>
      </Card>
    </div>
  );
}
