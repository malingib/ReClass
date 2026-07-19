<script lang="ts">
  import type { NotificationItem } from '$lib/notifications';

  let toasts: NotificationItem[] = $state([]);

  function handleToast(event: Event) {
    const detail = (event as CustomEvent<NotificationItem>).detail;
    const id = `toast-${detail.id}-${Date.now()}`;
    toasts = [...toasts, { ...detail, id }];
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
    }, 6000);
  }

  $effect(() => {
    const handler = (e: Event) => handleToast(e);
    window.addEventListener('reclass:notification-toast', handler);
    return () => window.removeEventListener('reclass:notification-toast', handler);
  });
</script>

<div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
  {#each toasts as toast (toast.id)}
    <div class="animate-slide-up rounded-2xl border border-brand-200 bg-white px-4 py-3 shadow-lg">
      <p class="text-sm font-semibold text-ink-900">{toast.title}</p>
      {#if toast.body}
        <p class="mt-0.5 text-xs text-ink-500">{toast.body}</p>
      {/if}
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
