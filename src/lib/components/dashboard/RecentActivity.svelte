<script lang="ts">
  interface ActivityRow {
    id: string; name: string; detail: string; time: string;
    kind: 'attendance' | 'payment' | 'session' | 'enrollment'; badge: string;
  }

  const { activity = [] }: { activity: ActivityRow[] } = $props();

  const teacherCount = $derived(activity.filter((a) => a.kind === 'attendance').length);
  const paymentCount = $derived(activity.filter((a) => a.kind === 'payment').length);
  const sessionCount = $derived(activity.filter((a) => a.kind === 'session').length);
  const heading = $derived(
    teacherCount
      ? `${teacherCount} teacher attendance marks today`
      : paymentCount
        ? `${paymentCount} recent parent M-Pesa payments`
        : 'No operations activity yet'
  );

  const teachersBadgeClass = (badge: string) =>
    badge === 'Present' ? 'bg-success/10 text-success'
    : badge === 'Late' ? 'bg-warning/10 text-warning'
    : badge === 'Absent' ? 'bg-danger/10 text-danger'
    : 'bg-ink-100 text-ink-600';

  const paymentBadgeClass = (badge: string) =>
    badge === 'Paid' ? 'bg-success/10 text-success'
    : badge === 'Partial' ? 'bg-warning/10 text-warning'
    : 'bg-ink-100 text-ink-600';
</script>

<div class="space-y-5">
  <div>
    <h3 class="text-sm font-semibold text-ink-900">Recent operations</h3>
    <p class="text-xs text-ink-500">{heading}</p>
  </div>

  {#if teacherCount > 0}
    <section>
      <div class="mb-3 flex items-center gap-2">
        <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Teacher attendance</h4>
        <span class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{teacherCount}</span>
      </div>
      <ul class="space-y-3">
        {#each activity.filter((a) => a.kind === 'attendance') as a}
          <li class="flex items-start gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
              {a.name.slice(0, 1).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-ink-900">{a.name}</p>
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold {teachersBadgeClass(a.badge)}">{a.badge}</span>
              </div>
              <p class="truncate text-xs text-ink-500">{a.detail}</p>
              <p class="text-[11px] text-ink-400">{a.time} &middot; Remedial session</p>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if paymentCount > 0}
    <section>
      <div class="mb-3 flex items-center gap-2">
        <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Parent M-Pesa payments</h4>
        <span class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">{paymentCount}</span>
      </div>
      <ul class="space-y-3">
        {#each activity.filter((a) => a.kind === 'payment') as a}
          <li class="flex items-start gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
              {a.name.slice(0, 1).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-ink-900">{a.name}</p>
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold {paymentBadgeClass(a.badge)}">{a.badge}</span>
              </div>
              <p class="truncate text-xs text-ink-500">{a.detail}</p>
              <p class="text-[11px] text-ink-400">{a.time} &middot; via M-Pesa paybill</p>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if sessionCount > 0}
    <section>
      <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Scheduled sessions</h4>
      <ul class="mt-3 space-y-3">
        {#each activity.filter((a) => a.kind === 'session') as a}
          <li class="flex items-start gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info/10 text-sm font-semibold text-info">
              {a.name.slice(0, 1).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink-900">{a.name}</p>
              <p class="truncate text-xs text-ink-500">{a.detail}</p>
              <p class="text-[11px] text-ink-400">{a.time}</p>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
