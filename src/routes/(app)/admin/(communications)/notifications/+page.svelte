<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const notifications = $derived(data.notifications);
  const stats = $derived(data.stats);
  const deliveryRate = $derived(data.deliveryRate);
</script>

<DashboardContent title="Notifications Dashboard" subtitle="SMS delivery monitoring and logs">
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-xs font-medium text-ink-400">Total</p>
      <p class="mt-1 text-2xl font-semibold text-ink-900">{stats.total}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-xs font-medium text-ink-400">Delivered</p>
      <p class="mt-1 text-2xl font-semibold text-success">{stats.sent}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-xs font-medium text-ink-400">Queued</p>
      <p class="mt-1 text-2xl font-semibold text-ink-600">{stats.queued}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-xs font-medium text-ink-400">Failed</p>
      <p class="mt-1 text-2xl font-semibold text-danger">{stats.failed}</p>
    </div>
    <div class="rounded-xl border border-border bg-white p-4 shadow-card">
      <p class="text-xs font-medium text-ink-400">Delivery Rate</p>
      <p class="mt-1 text-2xl font-semibold text-ink-900">{deliveryRate}%</p>
    </div>
  </div>

  <div class="mt-6 rounded-xl border border-border bg-white p-6 shadow-card">
    <h3 class="mb-3 text-sm font-semibold text-ink-900">Notification Log</h3>
    <DataTable
      data={notifications}
      columns={[
        { key: 'created_at', label: 'Time', render: (n: any) => n.created_at ? new Date(n.created_at).toLocaleString() : '—' },
        { key: 'channel', label: 'Channel', sortable: true },
        { key: 'recipient', label: 'Recipient' },
        { key: 'body', label: 'Message', render: (n: any) => n.body?.slice(0, 60) ?? '' },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'attempts', label: 'Attempts' },
        { key: 'last_error', label: 'Last Error', render: (n: any) => n.last_error?.slice(0, 40) ?? '—' },
      ]}
      emptyMessage="No notifications sent yet"
    />
  </div>
</DashboardContent>
