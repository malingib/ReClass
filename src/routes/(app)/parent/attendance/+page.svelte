<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let attendance = $derived(data.attendance);
  let children = $derived(data.children);

  function statusIcon(status: string) {
    switch (status) {
      case 'present': return CheckCircle;
      case 'late': return Clock;
      case 'absent': return XCircle;
      case 'excused': return AlertCircle;
      default: return CheckCircle;
    }
  }

  function statusClass(status: string) {
    switch (status) {
      case 'present': return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'late': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'absent': return 'bg-red-50 text-danger border-red-200';
      case 'excused': return 'bg-ink-50 text-ink-600 border-ink-200';
      default: return 'bg-ink-50 text-ink-600 border-ink-200';
    }
  }

  // Group attendance by student
  let groupedByStudent = $derived(() => {
    const map: Record<string, any[]> = {};
    for (const a of attendance) {
      const studentId = a.student_id;
      if (!map[studentId]) map[studentId] = [];
      map[studentId].push(a);
    }
    return map;
  });
</script>

<DashboardContent title="Attendance" subtitle="Your child's remedial attendance records">
  {#if children.length > 0}
    <Card>
      <CardHeader title="Your Children" subtitle="Select a child to view their attendance" />
      <CardContent>
        <div class="flex flex-wrap gap-2">
          {#each children as child}
            <span class="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {child?.first_name} {child?.last_name} — {child?.grade ?? 'No grade'}
            </span>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  {#if attendance.length === 0}
    <Card>
      <CardContent>
        <p class="text-sm text-ink-500">No attendance records found for your children.</p>
      </CardContent>
    </Card>
  {:else}
    {#each children as child (child?.id)}
      {@const records = attendance.filter((a: any) => a.student_id === child?.id)}
      {#if records.length > 0}
        <Card>
          <CardHeader title="{child?.first_name} {child?.last_name}" subtitle="{child?.grade ?? ''} — {records.length} record(s)" />
          <CardContent class="!px-0 !py-0">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-ink-50/70">
                    <th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Date</th>
                    <th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each records as rec, idx (rec.id)}
                    <tr class="border-b border-border/70 transition-colors last:border-b-0 hover:bg-brand-50/40 {idx % 2 === 0 ? 'bg-white/60' : 'bg-ink-50/40'}">
                      <td class="px-4 py-2.5 text-ink-700">
                        {rec.marked_at ? new Date(rec.marked_at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td class="px-4 py-2.5">
                        <span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium {statusClass(rec.status)}">
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      {/if}
    {/each}
  {/if}
</DashboardContent>
