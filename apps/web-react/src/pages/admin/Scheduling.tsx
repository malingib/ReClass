import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import { PageHeader } from '@/components/ui';

export function SchedulingCalendar() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scheduling"
        title="Scheduling Calendar"
        description="Remedial and class session slots plus school events. Select a day to see its slots."
      />
      <ScheduleCalendar />
    </div>
  );
}
