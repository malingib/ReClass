<script lang="ts">
  import type { NotificationItem } from '$lib/notifications';
  import { markNotificationAsRead, markNotificationSeen } from '$lib/notifications';
  import { onDestroy } from 'svelte';

  type Toast = NotificationItem & { originalId: string };
  let toasts: Toast[] = $state([]);
  const timers: ReturnType<typeof setTimeout>[] = [];
  let toastSeq = 0;

  function handleToast(event: Event) {
    const detail = (event as CustomEvent<NotificationItem>).detail;
    const id = `toast-${detail.id}-${Date.now()}-${toastSeq++}`;
    toasts = [...toasts, { ...detail, id, originalId: detail.id }];
    const timer = setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
    }, 6000);
    timers.push(timer);
  }

  function dismissToast(id: string) {
    const toast = toasts.find(t => t.id === id);
    if (toast) {
      // Explicitly dismissing a real notification should silence it for good:
      // it never toasts again and it drops out of the unread badge.
      if (!toast.read) {
        markNotificationAsRead(toast.originalId);
        markNotificationSeen(toast.originalId);
      }
      toasts = toasts.filter(t => t.id !== id);
    }
  }

  onDestroy(() => {
    timers.forEach(clearTimeout);
  });

  $effect(() => {
    const handler = (e: Event) => handleToast(e);
    window.addEventListener('reclass:notification-toast', handler);
    return () => window.removeEventListener('reclass:notification-toast', handler);
  });
</script>

<div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
  {#each toasts as toast (toast.id)}
    <div class="animate-slide-up flex items-start gap-3 rounded-2xl border border-brand-200 bg-white px-4 py-3 shadow-lg transition-shadow hover:shadow-xl">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink-900">{toast.title}</p>
        {#if toast.body}
          <p class="mt-0.5 text-xs text-ink-500">{toast.body}</p>
        {/if}
      </div>
      <button
        onclick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        class="shrink-0 rounded-full p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-up { animation: slide-up 0.3s ease-out; }
</style>
