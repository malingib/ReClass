<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();
  const classes = $derived(data.classes);
  const enrollments = $derived(data.enrollments as any[]);

  const rosterByClass = $derived.by(() => {
    const map = new Map<string, any[]>();
    for (const c of classes) map.set(c.id, []);
    for (const e of enrollments) {
      const list = map.get(e.class_id);
      if (list) list.push(e);
    }
    return map;
  });
</script>

<DashboardContent title="My classes" subtitle="Homeroom classes and student rosters — read-only">
  {#if classes.length === 0}
    <div class="flex flex-col items-center justify-center rounded-xl border border-slate-200/60 bg-white py-16 text-slate-500 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </div>
      <p class="text-sm font-semibold text-slate-700">No homeroom classes assigned</p>
      <p class="mt-1 text-xs text-slate-500">Classes you are the homeroom teacher for will appear here.</p>
    </div>
  {:else}
    <div class="space-y-6">
      {#each classes as c, i}
        {@const roster = rosterByClass.get(c.id) ?? []}
        <div class="anim-card stagger-{i + 1} overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
                <span class="text-sm font-bold">{c.name.slice(0, 1)}</span>
              </div>
              <div>
                <h2 class="text-base font-semibold text-slate-900">
                  {c.name}{c.stream ? ` · ${c.stream}` : ''}
                  <span class="ml-2 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{c.code}</span>
                </h2>
                <p class="mt-0.5 text-xs text-slate-500">
                  {c.academic_year ?? 'No academic year'} · {roster.length} student{roster.length === 1 ? '' : 's'} enrolled
                </p>
              </div>
            </div>
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold {c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
              {c.status}
            </span>
          </div>
          {#if roster.length === 0}
            <p class="px-6 py-8 text-center text-sm text-slate-500">No active enrollments in this class yet.</p>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                    <th class="px-6 py-3 font-medium">Adm No</th>
                    <th class="px-6 py-3 font-medium">Student</th>
                    <th class="px-6 py-3 font-medium">Cohort</th>
                    <th class="px-6 py-3 font-medium">Enrolled</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  {#each roster as e}
                    <tr class="transition-colors hover:bg-slate-50/50">
                      <td class="px-6 py-3 text-slate-500">{e.students?.admission_no ?? '—'}</td>
                      <td class="px-6 py-3 font-medium text-slate-900">{e.students?.first_name} {e.students?.last_name}</td>
                      <td class="px-6 py-3 text-slate-600">{e.students?.grade ?? '—'}</td>
                      <td class="px-6 py-3 text-slate-500">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</DashboardContent>
