<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();

  const roleLabel = $derived(
    data.committeeRole === 'chairman' ? 'Committee Chairman'
      : data.committeeRole === 'treasurer' ? 'Committee Treasurer'
      : 'Committee Member'
  );
  const isChairman = $derived(data.committeeRole === 'chairman' || data.committeeRole === 'member');
  const isTreasurer = $derived(data.committeeRole === 'treasurer');
  const pending = $derived(data.pendingAttendance ?? []);
  const runs = $derived(data.runs ?? []);
  const s = $derived(data.payoutStats);
  const a = $derived(data.attendanceStats);
</script>

<DashboardContent title={roleLabel} subtitle="Remedial committee workspace">
  <div class="space-y-8">
    <!-- Attendance overview -->
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Attendance rate" value={`${a?.rate ?? 0}%`} sub="Approved / due" />
      <KpiCard label="Marked" value={a?.present ?? 0} sub="Present + late" />
      <KpiCard label="Absent" value={a?.absent ?? 0} sub="Marked absent" />
      <KpiCard label="Awaiting review" value={pending.length} sub="Pending committee approval" />
    </section>

    {#if isChairman}
      <section class="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
        <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 class="text-base font-semibold text-slate-900">Teacher attendance awaiting approval</h2>
          <p class="mt-1 text-sm text-slate-500">Approve verified whole-class session delivery or reject it with a reason.</p>
        </div>
        {#if pending.length === 0}
          <div class="flex flex-col items-center justify-center py-16 text-slate-500">
            <p class="text-sm font-semibold text-slate-700">No attendance awaiting review</p>
            <p class="mt-1 text-xs text-slate-500">All caught up! Check back later for new submissions.</p>
          </div>
        {:else}
          <div class="divide-y divide-slate-100">
            {#each pending as attendance}
              <div class="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-slate-900">
                    {attendance.teachers?.first_name} {attendance.teachers?.last_name} · {attendance.session_occurrences?.class}
                  </p>
                  <p class="mt-0.5 truncate text-xs text-slate-500">
                    {attendance.session_occurrences?.sessions?.subjects?.name ?? 'Subject'} · {attendance.session_occurrences?.occurs_on} · {attendance.session_occurrences?.start_time?.slice(0, 5)}–{attendance.session_occurrences?.end_time?.slice(0, 5)}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <form method="POST" action="?/review">
                    <input type="hidden" name="attendance_id" value={attendance.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <Button type="submit" size="sm" class="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                  </form>
                  <form method="POST" action="?/review" class="flex gap-2">
                    <input type="hidden" name="attendance_id" value={attendance.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <input name="note" required placeholder="Rejection reason" class="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20" />
                    <Button type="submit" size="sm" variant="destructive">Reject</Button>
                  </form>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <!-- Payroll -->
    <section>
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">Remedial payroll</h2>
          <p class="mt-1 text-sm text-slate-500">Per-session rate × approved attendance, paid to teachers via M-Pesa B2C.</p>
        </div>
        {#if isTreasurer}
          <form method="POST" action="?/generate" class="flex flex-wrap items-end gap-2">
            <label class="text-xs font-medium text-slate-600">
              From
              <input name="period_start" type="date" required class="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none" />
            </label>
            <label class="text-xs font-medium text-slate-600">
              To
              <input name="period_end" type="date" required class="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none" />
            </label>
            <Button type="submit" size="sm" class="bg-blue-600 hover:bg-blue-700">Generate payroll</Button>
          </form>
        {/if}
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Awaiting payout" value={s?.pendingRuns ?? 0} sub="Approved & draft" />
        <KpiCard label="Processing" value={s?.processingRuns ?? 0} sub="B2C in flight" />
        <KpiCard label="Paid" value={s?.paidRuns ?? 0} sub={`KES ${(s?.totalPaid ?? 0).toLocaleString()}`} />
        <KpiCard label="Failed" value={s?.failedRuns ?? 0} sub="Need attention" />
      </div>

      <div class="mt-6">
        <DataTable
          data={runs}
          columns={[
            { key: 'teacher_name', label: 'Teacher', sortable: true },
            { key: 'period', label: 'Period', render: (r: any) => `${r.period_start} – ${r.period_end}` },
            { key: 'occurrences_count', label: 'Sessions', sortable: true },
            { key: 'amount', label: 'Amount', render: (r: any) => `KES ${Number(r.amount ?? 0).toLocaleString()}`, sortable: true },
            { key: 'status', label: 'Status', sortable: true, render: (r: any) => r.status },
            { key: 'last_error', label: 'Reason', render: (r: any) => r.last_error || '—' },
            { key: 'paid_at', label: 'Paid', render: (r: any) => r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—' },
          ]}
          emptyMessage="No payroll runs yet"
        />
      </div>

      {#if isTreasurer || isChairman}
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#if isChairman}
            <form method="POST" action="?/approve" class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex-1">
                <p class="text-xs font-medium text-slate-500">Approve a payroll run</p>
                <select name="id" required class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none">
                  <option value="">Select a draft run</option>
                  {#each runs.filter((r: any) => r.status === 'draft' || r.status === 'pending') as run}
                    <option value={run.id}>{run.teacher_name} · KES {Number(run.amount).toLocaleString()} · {run.period_start}–{run.period_end}</option>
                  {/each}
                </select>
              </div>
              <Button type="submit" size="sm" class="bg-blue-600 hover:bg-blue-700">Approve</Button>
            </form>
          {/if}
          {#if isTreasurer}
            <form method="POST" action="?/pay" class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex-1">
                <p class="text-xs font-medium text-slate-500">Send approved run to M-Pesa</p>
                <select name="id" required class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none">
                  <option value="">Select an approved run</option>
                  {#each runs.filter((r: any) => r.status === 'approved') as run}
                    <option value={run.id}>{run.teacher_name} · KES {Number(run.amount).toLocaleString()}</option>
                  {/each}
                </select>
              </div>
              <Button type="submit" size="sm" class="bg-emerald-600 hover:bg-emerald-700">Pay (M-Pesa)</Button>
            </form>
          {/if}
        </div>
      {/if}
    </section>
  </div>
</DashboardContent>