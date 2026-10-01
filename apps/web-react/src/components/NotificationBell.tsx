import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useRemedial';

export function NotificationBell() {
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => (n as { status?: string }).status === 'queued').length;
  return (
    <Link to="/" className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground" title="Notifications" aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}>
      <Bell className="size-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-xs font-bold leading-4 text-destructive-foreground">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
