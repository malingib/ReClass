export type NotificationPriority = 'high' | 'normal' | 'low';

export type NotificationItem = {
  id: string;
  title: string;
  created_at: string;
  read: boolean;
  priority?: NotificationPriority;
  body?: string;
  channel?: string;
  status?: string;
  related_type?: string;
  related_id?: string;
};

const READ_STORAGE_KEY = 'reclass.read-notifications';

export function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function getStoredReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const stored = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!stored) return new Set<string>();
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

export function markNotificationAsRead(id: string) {
  if (typeof window === 'undefined') return;
  const nextIds = getStoredReadNotificationIds();
  nextIds.add(id);
  window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(nextIds)));
}

export function markAllNotificationsRead(ids: string[]) {
  if (typeof window === 'undefined') return;
  const nextIds = new Set(getStoredReadNotificationIds());
  ids.forEach((id) => nextIds.add(id));
  window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(nextIds)));
}

export function normalizeNotification(raw: Record<string, unknown>, readIds: Set<string> = getStoredReadNotificationIds()): NotificationItem {
  const body = typeof raw.body === 'string' ? raw.body : typeof raw.template === 'string' ? raw.template : 'Notification';
  const title = typeof raw.title === 'string' ? raw.title : body;
  const rawPriority = typeof raw.priority === 'string' ? raw.priority : null;
  const priority = (rawPriority === 'high' || rawPriority === 'normal' || rawPriority === 'low')
    ? rawPriority
    : /payment|urgent|overdue/i.test(body)
      ? 'high'
      : 'normal';

  return {
    id: String(raw.id),
    title,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    read: readIds.has(String(raw.id)),
    priority: priority as NotificationPriority,
    body,
    channel: typeof raw.channel === 'string' ? raw.channel : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    related_type: typeof raw.related_type === 'string' ? raw.related_type : undefined,
    related_id: typeof raw.related_id === 'string' ? raw.related_id : undefined,
  };
}

export function getNotificationToneClass(notification: Pick<NotificationItem, 'priority' | 'read'>) {
  if (notification.priority === 'high' && !notification.read) return 'bg-danger';
  if (!notification.read) return 'bg-brand-500';
  return 'bg-ink-300';
}

export function shouldSurfaceToast(notification: Pick<NotificationItem, 'id' | 'priority' | 'read'>, seenIds: Set<string>) {
  if (notification.priority !== 'high' || notification.read) return false;
  if (seenIds.has(notification.id)) return false;
  seenIds.add(notification.id);
  return true;
}

export function dispatchNotificationToast(notification: NotificationItem) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NotificationItem>('reclass:notification-toast', { detail: notification }));
}

/** Simple toast for form feedback (no persistence, no priority). */
export function dispatchToast(title: string, body?: string) {
  dispatchNotificationToast({
    id: `toast-${Date.now()}`,
    title,
    body,
    created_at: new Date().toISOString(),
    read: true,
  });
}
