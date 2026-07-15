<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import { formatNotificationDate, getNotificationToneClass, getStoredReadNotificationIds, markAllNotificationsRead, markNotificationAsRead, normalizeNotification, type NotificationItem } from '$lib/notifications';
  import AppShell from '$lib/components/layout/AppShell.svelte';


  let items = $state<NotificationItem[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let supabase = getSupabase();

  $effect(() => {
    async function load() {
      isLoading = true;
      error = null;
      try {
        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select('id, body, created_at, channel, template, status, related_type, related_id')
          .order('created_at', { ascending: false })
          .limit(25);
        if (fetchError) throw fetchError;
        const readIds = getStoredReadNotificationIds();
        items = (data ?? []).map((n: Record<string, unknown>) => normalizeNotification(n, readIds));
      } catch (err) {
        error = 'We could not load your notifications.';
        console.error(err);
      } finally {
        isLoading = false;
      }
    }
    load();
  });

  function markAllRead() {
    if (items.every((n) => n.read)) return;
    markAllNotificationsRead(items.map((n) => n.id));
    items = items.map((n) => ({ ...n, read: true }));
  }

  function markOneRead(id: string) {
    markNotificationAsRead(id);
    items = items.map((n) => n.id === id ? { ...n, read: true } : n);
  }

  let role = $derived('school_admin');
</script>

<AppShell role={role} title="Notifications" subtitle="Inbox-first updates">
  <div class="space-y-6">
    <div class="rounded-xl border border-border bg-white shadow-card">
      <div class="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h3 class="text-sm font-semibold text-ink-900">Your inbox</h3>
          <p class="mt-0.5 text-xs text-ink-500">High-priority alerts surface as toasts while the inbox keeps the full context.</p>
        </div>
        <button onclick={markAllRead} disabled={items.every((n) => n.read)} class="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">
          Mark all read
        </button>
      </div>
      <div class="px-6 py-5">
        {#if isLoading}
          <div class="space-y-3">
            {#each [0, 1, 2] as i}
              <div class="h-14 animate-pulse rounded-lg bg-ink-100"></div>
            {/each}
          </div>
        {:else if error}
          <div class="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
            <p>{error}</p>
            <button onclick={() => location.reload()} class="mt-2 font-medium underline">Try again</button>
          </div>
        {:else if items.length === 0}
          <div class="rounded-lg border border-dashed border-border bg-canvas p-8 text-center text-sm text-ink-500">
            No notifications yet. High-priority reminders will appear here and as toasts when needed.
          </div>
        {:else}
          <div class="space-y-3">
            {#each items as item}
              <button
                onclick={() => markOneRead(item.id)}
                class="flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors {!item.read ? 'border-brand-200 bg-brand-50/70 hover:bg-brand-50' : 'border-border bg-white hover:bg-ink-50'}"
              >
                <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full {getNotificationToneClass(item)}"></span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-medium {!item.read ? 'text-ink-900' : 'text-ink-700'}">{item.title}</span>
                  {#if item.body}
                    <span class="mt-1 block text-sm text-ink-500">{item.body}</span>
                  {/if}
                  <span class="mt-2 block text-xs text-ink-400">{formatNotificationDate(item.created_at)}</span>
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</AppShell>
