import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, Skeleton, StatusPill } from './ui';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Student card — MemberCard port from welfare-connect.
 * Mobile-first: compact padding, truncated text, skeleton loading.
 */
export function StudentCard({
  student,
  onClick,
  className,
  isLoading,
}: {
  student?: { id: string; name: string; admissionNo?: string; className?: string; status?: string };
  onClick?: () => void;
  className?: string;
  isLoading?: boolean;
}) {
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 gap-2 sm:gap-4">
              <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full sm:h-12 sm:w-12" />
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-2 h-4 w-32 sm:h-5" />
                <Skeleton className="mb-2 h-3 w-20 sm:h-4" />
                {!isMobile && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                )}
              </div>
            </div>
            <Skeleton className="h-5 w-5 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!student) return null;

  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <Card
      className={cn('hover-lift overflow-hidden', onClick && 'cursor-pointer', className)}
    >
      <CardContent className="p-3 sm:p-5">
        <div className="mb-2 flex items-start justify-between gap-2" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
          <div className="flex min-w-0 flex-1 gap-2 sm:gap-4">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border-2 border-primary/10 bg-primary/10 text-xs font-bold text-primary sm:h-12 sm:w-12" aria-hidden>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <h3 className="truncate text-sm font-medium sm:text-base">{student.name}</h3>
                {student.status && <StatusPill status={student.status} />}
              </div>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {[student.admissionNo && `#${student.admissionNo}`, student.className].filter(Boolean).join(' · ') || 'Student'}
              </p>
            </div>
          </div>
          {onClick && <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />}
        </div>
      </CardContent>
    </Card>
  );
}
