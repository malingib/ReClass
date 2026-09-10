<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { CheckCircle2, ClipboardCheck, AlertCircle } from 'lucide-svelte';
  const { data } = $props();
  const attendance = $derived(data.attendance ?? []);
  const pending = $derived(attendance.filter((a: any) => a.approval_status === 'pending'));
  const approved = $derived(attendance.filter((a: any) => a.approval_status === 'approved'));
</script>

<DashboardContent title="Teacher attendance" subtitle="Review remedial delivery records before they become payroll evidence.">
  <div class="space-y-6">
    <section class="grid gap-3 sm:grid-cols-3">
      <div class="ui-card p-4"><p class="text-xs text-ink-400">Needs review</p><p class="mt-1 text-2xl font-bold text-amber-700">{pending.length}</p><p class="mt-1 text-xs text-ink-400">Records awaiting approval</p></div>
      <div class="ui-card p-4"><p class="text-xs text-ink-400">Approved</p><p class="mt-1 text-2xl font-bold text-emerald-700">{approved.length}</p><p class="mt-1 text-xs text-ink-400">Ready as delivery evidence</p></div>
      <div class="ui-card p-4"><p class="text-xs text-ink-400">Total records</p><p class="mt-1 text-2xl font-bold text-ink-900">{attendance.length}</p><p class="mt-1 text-xs text-ink-400">Teacher submissions</p></div>
    </section>

    {#if pending.length > 0}
      <section class="ui-card p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 class="text-lg font-semibold text-ink-900">Attendance review queue</h2>
            <p class="mt-1 text-sm text-ink-500">Confirm that the remedial session was delivered. Approved attendance becomes payroll evidence.</p>
          </div>
        </div>
        <div class="mt-5 space-y-3">
          {#each pending as item (item.id)}
            <div class="rounded-lg border border-border/60 p-4">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0">
                  <p class="font-semibold text-ink-900">{item.teacher_name ?? item.teachers?.full_name ?? 'Unknown teacher'}</p>
                  <p class="mt-1 text-sm text-ink-500">{item.group_name ?? item.subject ?? 'Remedial session'} · {item.marked_at ? new Date(item.marked_at).toLocaleDateString('en-GB') : '—'}</p>
                  <p class="mt-1 text-xs text-ink-400">Attendance: <span class="font-medium uppercase">{item.status ?? '—'}</span></p>
                </div>
                <form method="POST" action="?/review" class="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <input type="hidden" name="attendance_id" value={item.id} />
                  <label class="min-w-64">
                    <span class="mb-1 block text-xs font-medium text-ink-500">Review note</span>
                    <input name="note" class="ui-input w-full" placeholder="Required only if rejecting" />
                  </label>
                  <button name="decision" value="rejected" type="submit" class="ui-button-secondary">Reject</button>
                  <button name="decision" value="approved" type="submit" class="ui-button-primary">Approve</button>
                </form>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <section class="ui-card overflow-hidden">
      <div class="border-b border-border/60 px-5 py-4 sm:px-6">
        <div class="flex items-center gap-2"><ClipboardCheck class="h-5 w-5 text-primary" /><div><h2 class="text-lg font-semibold text-ink-900">Delivery evidence</h2><p class="mt-1 text-sm text-ink-400">Attendance belongs to remedial operations; payroll consumes approved evidence.</p></div></div>
      </div>
      <DataTable data={attendance} columns={[{ key: 'teacher', label: 'Teacher', render: (a: any) => a.teacher_name ?? a.teachers?.full_name ?? '—' }, { key: 'group', label: 'Remedial group', render: (a: any) => a.group_name ?? a.subject ?? '—' }, { key: 'date', label: 'Date', sortable: true, render: (a: any) => a.date ? new Date(a.date).toLocaleDateString('en-GB') : '—' }, { key: 'status', label: 'Attendance', render: (a: any) => a.status ?? '—' }, { key: 'approval_status', label: 'Review', render: (a: any) => a.approval_status ?? 'pending' }]} emptyMessage="No attendance captured yet — teacher submissions will appear here for review." />
    </section>

    {#if approved.length > 0}
      <div class="ui-status ui-status-success"><CheckCircle2 class="h-4 w-4" /><span>Approved attendance remains available as payroll evidence. <a href="/admin/payroll" class="font-semibold underline">Open payroll</a></span></div>
    {/if}
  </div>
</DashboardContent>
