import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import { PageHeader } from '@/components/ui';

export function SchedulingCalendar() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scheduling"
        title="Scheduling Calendar"
        description="Plan subjects, assign teachers, reserve time slots, and manage the school timetable alongside remedial programming."
      />
      <ScheduleCalendar />
    </div>
  );
}
