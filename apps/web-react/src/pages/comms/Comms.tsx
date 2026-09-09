import { SmsComposer } from '@/components/SmsComposer';
import { useNotifications } from '@/hooks/useRemedial';
import { DataTable } from '@/components/DataTable';
import { Announcements, CommTemplates } from '@/pages/admin/Tables';

export function CommsOverview() {
  const { data = [] } = useNotifications();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Communications</h1>
      <SmsComposer />
      <h2 className="font-medium">Recent queue</h2>
      <DataTable columns={['Recipient', 'Channel', 'Status', 'Date']} rows={data.slice(0, 20).map((n) => [n.recipient, n.channel, n.status, n.created_at])} />
    </div>
  );
}

export { Announcements, CommTemplates };

export function NotificationInbox() {
  const { data = [], isLoading } = useNotifications();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Notifications</h1>
      {isLoading ? <p className="text-sm opacity-70">Loading…</p> : (
        <DataTable columns={['Body', 'Channel', 'Status', 'Date']} rows={data.map((n) => [n.body, n.channel, n.status, n.created_at])} />
      )}
    </div>
  );
}
