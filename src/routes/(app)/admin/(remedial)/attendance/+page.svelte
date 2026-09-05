<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { CheckCircle2, ClipboardCheck, Clock3, AlertCircle } from 'lucide-svelte';
  const { data } = $props();
  const attendance = $derived(data.attendance ?? []);
  const pending = $derived(attendance.filter((a: any) => a.approval_status !== 'approved'));
  const approved = $derived(attendance.filter((a: any) => a.approval_status === 'approved'));
</script>
<DashboardContent title="Teacher attendance" subtitle="Review remedial delivery records before they become payroll evidence.">
  <div class="space-y-6">
    <section class="grid gap-3 sm:grid-cols-3"><div class="ui-card p-4"><p class="text-xs text-ink-400">Needs review</p><p class="mt-1 text-2xl font-bold text-amber-700">{pending.length}</p><p class="mt-1 text-xs text-ink-400">Records awaiting approval</p></div><div class="ui-card p-4"><p class="text-xs text-ink-400">Approved</p><p class="mt-1 text-2xl font-bold text-emerald-700">{approved.length}</p><p class="mt-1 text-xs text-ink-400">Ready as delivery evidence</p></div><div class="ui-card p-4"><p class="text-xs text-ink-400">Total records</p><p class="mt-1 text-2xl font-bold text-ink-900">{attendance.length}</p><p class="mt-1 text-xs text-ink-400">Teacher submissions</p></div></section>
    {#if pending.length > 0}<section class="ui-status ui-status-warning"><AlertCircle class="h-4 w-4 shrink-0" /><span><strong>{pending.length} attendance record{pending.length === 1 ? '' : 's'}</strong> need review. Confirm delivery before approval.</span></section>{/if}
    <section class="ui-card overflow-hidden"><div class="border-b border-border/60 px-5 py-4 sm:px-6"><div class="flex items-center gap-2"><ClipboardCheck class="h-5 w-5 text-primary" /><div><h2 class="text-lg font-semibold text-ink-900">Delivery evidence</h2><p class="mt-1 text-sm text-ink-400">Attendance belongs to remedial operations; payroll consumes approved evidence.</p></div></div></div><DataTable data={attendance} columns={[{ key: 'teacher', label: 'Teacher', render: (a: any) => a.teacher_name ?? a.teachers?.full_name ?? '—' }, { key: 'group', label: 'Remedial group', render: (a: any) => a.group_name ?? a.subject ?? '—' }, { key: 'date', label: 'Date', sortable: true, render: (a: any) => a.date ? new Date(a.date).toLocaleDateString('en-GB') : '—' }, { key: 'status', label: 'Attendance', render: (a: any) => a.status ?? '—' }, { key: 'approval_status', label: 'Review', render: (a: any) => a.approval_status ?? 'pending' }]} emptyMessage="No attendance captured yet — teacher submissions will appear here for review." /></section>
    {#if approved.length > 0}<div class="ui-status ui-status-success"><CheckCircle2 class="h-4 w-4" /><span>Approved attendance remains available as payroll evidence. <a href="/admin/(remedial)/payroll" class="font-semibold underline">Open payroll</a></span></div>{/if}
  </div>
</DashboardContent>