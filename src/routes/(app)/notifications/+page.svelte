<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import { formatNotificationDate, getNotificationToneClass, getStoredReadNotificationIds, markAllNotificationsRead, markNotificationAsRead, normalizeNotification, type NotificationItem } from '$lib/notifications';

  const { data }: { data: { tenantId: string } } = $props();

  let items = $state<NotificationItem[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let selected = $state<Set<string>>(new Set());
  const supabase = getSupabase();
  const tenantId = $derived(data.tenantId);

  async function ensureContext() {
    if (tenantId) await (supabase.rpc as any)('set_tenant_context', { p_tenant_id: tenantId });
  }

  $effect(() => {
    async function load() {
      isLoading = true;
      error = null;
      try {
        await ensureContext();
        let q = supabase
          .from('notifications')
          .select('id, body, created_at, channel, template, status, related_type, related_id')
          .order('created_at', { ascending: false })
          .limit(50);
        if (tenantId) q = q.eq('tenant_id', tenantId);

        const { data: rows, error: fetchError } = await q;
        if (fetchError) throw fetchError;
        const readIds = getStoredReadNotificationIds();
        items = (rows ?? []).map((n: Record<string, unknown>) => normalizeNotification(n, readIds));
      } catch {
        error = 'We could not load your notifications.';
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

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} notification${selected.size !== 1 ? 's' : ''}?`)) return;
    const { error: delError } = await supabase
      .from('notifications')
      .delete()
      .in('id', [...selected]);
    if (delError) {
      error = 'Failed to delete notifications. Please try again.';
      return;
    }
    items = items.filter((n) => !selected.has(n.id));
    selected = new Set();
  }

  async function deleteOne(id: string) {
    const { error: delError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (!delError) items = items.filter((n) => n.id !== id);
  }
</script>

<div class="rounded-xl border border-border bg-white shadow-card">
  <div class="flex items-center justify-between border-b border-border px-6 py-5">
    <div>
      <h3 class="text-sm font-semibold text-ink-900">Your inbox</h3>
      <p class="mt-0.5 text-xs text-ink-500">
        {items.length} notification{items.length !== 1 ? 's' : ''}
        {items.filter((n) => !n.read).length > 0 ? ` (${items.filter((n) => !n.read).length} unread)` : ''}
      </p>
    </div>
    <div class="flex items-center gap-3">
      {#if selected.size > 0}
        <button onclick={deleteSelected} class="text-sm font-medium text-danger hover:text-danger/80">
          Delete ({selected.size})
        </button>
      {/if}
      <button onclick={markAllRead} disabled={items.every((n) => n.read)} class="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">
        Mark all read
      </button>
    </div>
  </div>
  <div class="px-6 py-5">
    {#if isLoading}
      <div class="space-y-3">
        {#each [0, 1, 2] as _i}
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
          <div class="flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors {!item.read ? 'border-brand-200 bg-brand-50/70' : 'border-border bg-white'}">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onchange={() => toggleSelect(item.id)}
              class="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <button
              onclick={() => markOneRead(item.id)}
              class="flex min-w-0 flex-1 items-start gap-3 text-left"
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
            <button
              onclick={() => deleteOne(item.id)}
              class="shrink-0 text-xs font-medium text-ink-400 hover:text-danger"
              title="Delete"
            >
              ✕
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
