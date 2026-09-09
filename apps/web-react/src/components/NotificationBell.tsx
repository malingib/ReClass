import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useRemedial';

export function NotificationBell() {
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => (n as { status?: string }).status === 'queued').length;
  return <Link to="/notifications" className="text-sm">Alerts{unread > 0 ? ` (${unread})` : ''}</Link>;
}
