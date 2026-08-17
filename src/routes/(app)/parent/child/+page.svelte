<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();
  const students = $derived(data.students);
  const enrollments = $derived(data.enrollments);
  const payments = $derived(data.payments);

  const enrollmentByStudent = $derived.by(() => {
    const map = new Map<string, any[]>();
    for (const s of students) map.set(s.id, []);
    for (const e of enrollments) {
      const list = map.get(e.student_id);
      if (list) list.push(e);
    }
    return map;
  });

  const paymentsByStudent = $derived.by(() => {
    const map = new Map<string, any[]>();
    for (const s of students) map.set(s.id, []);
    for (const p of payments) {
      if (p.student_id) {
        const list = map.get(p.student_id);
        if (list) list.push(p);
      }
    }
    return map;
  });
</script>

<DashboardContent title="Child profile" subtitle="Your child's full school record — read-only">
  {#if students.length === 0}
    <div class="flex flex-col items-center justify-center rounded-xl border border-slate-200/60 bg-white py-16 text-slate-500 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <p class="text-sm font-semibold text-slate-700">No linked children</p>
      <p class="mt-1 text-xs text-slate-500">Your account is not linked to any student records yet.</p>
    </div>
  {:else}
    <div class="space-y-8">
      {#each students as s, i}
        {@const childEnrollments = enrollmentByStudent.get(s.id) ?? []}
        {@const childPayments = paymentsByStudent.get(s.id) ?? []}
        {@const current = childEnrollments.find((e) => e.status === 'active')}
        <div class="anim-card stagger-{i + 1} overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
          <!-- Header -->
          <div class="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-base font-bold text-white shadow-lg shadow-blue-500/25">
              {s.first_name.slice(0, 1)}{s.last_name.slice(0, 1)}
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-900">{s.first_name} {s.last_name}</h2>
              <p class="mt-0.5 text-sm text-slate-500">
                Adm No {s.admission_no} · Cohort {s.grade ?? '—'}
              </p>
            </div>
            {#if current}
              <div class="text-right">
                <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Current class</p>
                <p class="text-sm font-semibold text-slate-900">
                  {current.sis_classes?.name}{current.sis_classes?.stream ? ` · ${current.sis_classes.stream}` : ''}
                  <span class="ml-1 text-xs font-normal text-slate-500">({current.academic_year})</span>
                </p>
              </div>
            {:else}
              <span class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Not enrolled</span>
            {/if}
          </div>

          <div class="grid gap-6 p-6 lg:grid-cols-2">
            <!-- Enrollment timeline -->
            <div>
              <h3 class="mb-3 text-sm font-semibold text-slate-900">Enrollment history</h3>
              {#if childEnrollments.length === 0}
                <p class="text-sm text-slate-500">No enrollment records.</p>
              {:else}
                <ol class="space-y-4">
                  {#each childEnrollments as e}
                    <li class="relative pl-6">
                      <span class="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full {e.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                      <p class="text-sm font-medium text-slate-900">
                        {e.sis_classes?.name}{e.sis_classes?.stream ? ` · ${e.sis_classes.stream}` : ''}
                        <span class="ml-1 text-xs font-normal text-slate-500">({e.academic_year})</span>
                      </p>
                      <p class="text-xs text-slate-500">
                        {e.enrolled_at ? `Enrolled ${new Date(e.enrolled_at).toLocaleDateString()}` : ''}
                        {e.exited_at ? ` · Exited ${new Date(e.exited_at).toLocaleDateString()}` : ''}
                        · <span class="capitalize">{e.status}</span>
                      </p>
                    </li>
                  {/each}
                </ol>
              {/if}
            </div>

            <!-- Payments -->
            <div>
              <h3 class="mb-3 text-sm font-semibold text-slate-900">Recent payments</h3>
              {#if childPayments.length === 0}
                <p class="text-sm text-slate-500">No payments yet.</p>
              {:else}
                <div class="overflow-hidden rounded-lg border border-slate-100">
                  <table class="w-full text-left text-sm">
                    <thead>
                      <tr class="border-b border-slate-100 bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400">
                        <th class="px-4 py-2.5 font-medium">Date</th>
                        <th class="px-4 py-2.5 font-medium">Fee</th>
                        <th class="px-4 py-2.5 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                      {#each childPayments as p}
                        <tr class="transition-colors hover:bg-slate-50/50">
                          <td class="px-4 py-2.5 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td class="px-4 py-2.5 text-slate-900">{p.fee_type}{p.domain === 'remedial' ? ' (remedial)' : ''}</td>
                          <td class="px-4 py-2.5 text-right font-medium text-slate-900">KES {Number(p.amount).toLocaleString()}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</DashboardContent>
