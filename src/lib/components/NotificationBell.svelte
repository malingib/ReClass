<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import { formatNotificationDate, getNotificationToneClass, getStoredReadNotificationIds, getStoredSeenNotificationIds, markAllNotificationsRead, markNotificationAsRead, normalizeNotification, surfaceNotificationToast, type NotificationItem } from '$lib/notifications';

  const { tenantId }: { tenantId: string } = $props();

  let count = $state(0);
  let items = $state<NotificationItem[]>([]);
  let open = $state(false);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  // Persisted so a high-priority notification only toasts once per browser
  // instead of again on every page load / HMR remount.
  const seenToastIds = getStoredSeenNotificationIds();

  const supabase = getSupabase();

  async function ensureTenantContext() {
    if (!tenantId) return;
    await (supabase.rpc as any)('set_tenant_context', { p_tenant_id: tenantId });
  }

  async function loadNotifications() {
    isLoading = true;
    error = null;
    try {
      await ensureTenantContext();
      let q = supabase
        .from('notifications')
        .select('id, body, created_at, channel, template, status, related_type, related_id')
        .order('created_at', { ascending: false })
        .limit(10);
      if (tenantId) q = q.eq('tenant_id', tenantId);

      const { data, error: fetchError } = await q;

      if (fetchError) throw fetchError;

      const readIds = getStoredReadNotificationIds();
      const nextItems: NotificationItem[] = (data ?? []).map((n: Record<string, unknown>) => normalizeNotification(n, readIds));
      items = nextItems;
      count = nextItems.filter((n: NotificationItem) => !n.read).length;

      nextItems.forEach((n: NotificationItem) => surfaceNotificationToast(n, seenToastIds));
    } catch {
      error = 'We could not load notifications right now.';
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    loadNotifications();
    const sub = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined }, () => loadNotifications())
      .subscribe();
    return () => sub.unsubscribe();
  });

  $effect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (open && !target.closest('[data-notification-bell]')) {
        open = false;
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  });

  function markAllAsRead() {
    if (items.every((n) => n.read)) return;
    markAllNotificationsRead(items.map((n) => n.id));
    items = items.map((n) => ({ ...n, read: true }));
    count = 0;
  }

  function markOneAsRead(id: string) {
    markNotificationAsRead(id);
    items = items.map((n) => n.id === id ? { ...n, read: true } : n);
    count = Math.max(0, count - 1);
  }
</script>

<div data-notification-bell class="relative">
  <button
    onclick={() => open = !open}
    aria-label="{count} unread notifications"
    class="btn-press icon-spin relative flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-all duration-200 hover:bg-brand-50 hover:text-brand-600 hover:shadow-md hover:shadow-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
  >
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
    {#if count > 0}
      <span class="badge-pulse absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
        {count > 9 ? '9+' : count}
      </span>
    {/if}
  </button>

  {#if open}
    <div class="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border border-border bg-white shadow-card sm:absolute sm:inset-auto sm:right-0 sm:mt-2 sm:w-80 sm:rounded-lg">
      <div class="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p class="text-sm font-semibold text-ink-900">Notifications</p>
          <p class="text-xs text-ink-500">Inbox-style updates</p>
        </div>
        <div class="flex items-center gap-3">
          <a
            href="/notifications"
            class="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            View all
          </a>
          <button
            onclick={markAllAsRead}
            disabled={items.every((n) => n.read)}
            class="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      {#if isLoading}
        <div class="space-y-2 px-4 py-4">
          {#each [0, 1, 2] as _i}
            <div class="h-12 animate-pulse rounded-md bg-ink-100"></div>
          {/each}
        </div>
      {:else if error}
        <div class="px-4 py-6 text-center">
          <p class="text-sm font-medium text-ink-800">{error}</p>
          <button onclick={() => loadNotifications()} class="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700">Try again</button>
        </div>
      {:else if items.length === 0}
        <div class="px-4 py-6 text-center text-sm text-ink-500">No new notifications right now.</div>
      {:else}
        <div class="max-h-80 overflow-y-auto">
          {#each items as notification}
            <button
              onclick={() => markOneAsRead(notification.id)}
              class="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-0 {!notification.read ? 'bg-brand-50/70' : 'bg-white'}"
            >
              <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full {getNotificationToneClass(notification)}"></span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium {!notification.read ? 'text-ink-900' : 'text-ink-700'}">{notification.title}</span>
                <span class="mt-1 block text-xs text-ink-500">{formatNotificationDate(notification.created_at)}</span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
