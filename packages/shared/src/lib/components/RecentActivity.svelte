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
    badge === 'Present' ? 'bg-emerald-100 text-emerald-700'
    : badge === 'Late' ? 'bg-amber-100 text-amber-700'
    : badge === 'Absent' ? 'bg-red-100 text-red-700'
    : 'bg-slate-100 text-slate-600';

  const paymentBadgeClass = (badge: string) =>
    badge === 'Paid' ? 'bg-emerald-100 text-emerald-700'
    : badge === 'Partial' ? 'bg-amber-100 text-amber-700'
    : 'bg-slate-100 text-slate-600';
</script>

<div class="rounded-xl border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
  <div class="mb-6">
    <h3 class="text-lg font-semibold text-slate-900">Recent operations</h3>
    <p class="mt-1 text-sm text-slate-500">{heading}</p>
  </div>

  {#if teacherCount > 0}
    <section class="mb-6">
      <div class="mb-4 flex items-center gap-2">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Teacher attendance</h4>
        <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">{teacherCount}</span>
      </div>
      <ul class="space-y-4">
        {#each activity.filter((a) => a.kind === 'attendance') as a}
          <li class="group flex items-start gap-3 rounded-lg p-2 -m-2 transition-colors hover:bg-slate-50">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 text-sm font-semibold text-emerald-700 shadow-sm">
              {a.name.slice(0, 1).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-slate-900">{a.name}</p>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {teachersBadgeClass(a.badge)}">{a.badge}</span>
              </div>
              <p class="mt-0.5 truncate text-xs text-slate-500">{a.detail}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">{a.time} &middot; Remedial session</p>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if paymentCount > 0}
    <section class="mb-6">
      <div class="mb-4 flex items-center gap-2">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Parent M-Pesa payments</h4>
        <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white">{paymentCount}</span>
      </div>
      <ul class="space-y-4">
        {#each activity.filter((a) => a.kind === 'payment') as a}
          <li class="group flex items-start gap-3 rounded-lg p-2 -m-2 transition-colors hover:bg-slate-50">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-50 to-violet-100 text-sm font-semibold text-violet-700 shadow-sm">
              {a.name.slice(0, 1).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-slate-900">{a.name}</p>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {paymentBadgeClass(a.badge)}">{a.badge}</span>
              </div>
              <p class="mt-0.5 truncate text-xs text-slate-500">{a.detail}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">{a.time} &middot; via M-Pesa paybill</p>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if sessionCount > 0}
    <section>
      <div class="mb-4 flex items-center gap-2">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled sessions</h4>
        <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">{sessionCount}</span>
      </div>
      <ul class="space-y-4">
        {#each activity.filter((a) => a.kind === 'session') as a}
          <li class="group flex items-start gap-3 rounded-lg p-2 -m-2 transition-colors hover:bg-slate-50">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-sm font-semibold text-blue-700 shadow-sm">
              {a.name.slice(0, 1).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-900">{a.name}</p>
              <p class="mt-0.5 truncate text-xs text-slate-500">{a.detail}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">{a.time}</p>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
