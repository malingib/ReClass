<script lang="ts">
  // @ts-nocheck
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let sessions = $derived(data.sessions);
  let teacher = $derived(data.teacher);
  let groupStudents = $derived<Record<string, any[]>>(data.groupStudents ?? {});
  let existingAttendance = $derived<Record<string, Record<string, any>>>(data.existingAttendance ?? {});

  // Track selected status per student per session
  let attendanceState = $state<Record<string, Record<string, string>>>({});

  // Initialize state from existing attendance
  $effect(() => {
    for (const session of sessions) {
      if (!attendanceState[session.id]) {
        attendanceState[session.id] = {};
      }
      const occAttendance = existingAttendance[session.occurrence_id] ?? {};
      for (const [studentId, record] of Object.entries(occAttendance)) {
        attendanceState[session.id][studentId] = record.status;
      }
    }
  });

  function setStatus(sessionId: string, studentId: string, status: string) {
    if (!attendanceState[sessionId]) attendanceState[sessionId] = {};
    attendanceState[sessionId][studentId] = status;
  }

  function setAllPresent(sessionId: string, studentIds: string[]) {
    if (!attendanceState[sessionId]) attendanceState[sessionId] = {};
    for (const sid of studentIds) {
      attendanceState[sessionId][sid] = 'present';
    }
  }

  function studentStatus(session: any, studentId: string): string {
    return attendanceState[session.id]?.[studentId] ?? existingAttendance[session.occurrence_id]?.[studentId]?.status ?? 'present';
  }

  function occurrenceStudents(session: any): any[] {
    return groupStudents[session.group_id] ?? [];
  }

  let saving = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  async function handleMarkAllPresent(session: any) {
    const students = occurrenceStudents(session);
    if (students.length === 0) return;

    saving = session.id;
    successMessage = null;

    const formData = new FormData();
    formData.set('occurrence_id', session.occurrence_id);
    formData.set('student_ids', JSON.stringify(students.map((s: any) => s.id)));

    const resp = await fetch('?/markAllPresent', { method: 'POST', body: formData });
    const result = await resp.json();

    saving = null;
    if (result?.success) {
      setAllPresent(session.id, students.map((s: any) => s.id));
      successMessage = 'All marked present';
      setTimeout(() => successMessage = null, 2000);
    }
  }
</script>

<DashboardContent title="Mark Student Attendance" subtitle="Record which students attended each remedial session today">
  {#snippet headerActions()}
    <a href="/teacher/attendance" class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">My Records</a>
  {/snippet}

  {#if !teacher}
    <Card>
      <CardContent>
        <p class="text-sm text-ink-500">You don't have a teacher profile linked to your account. Please contact the admin.</p>
      </CardContent>
    </Card>
  {:else if sessions.length === 0}
    <Card>
      <CardContent>
        <p class="text-sm text-ink-500">No remedial sessions scheduled for you today.</p>
      </CardContent>
    </Card>
  {:else}
    {#if successMessage}
      <div class="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">{successMessage}</div>
    {/if}

    {#each sessions as session}
      {@const students = occurrenceStudents(session)}
      <Card>
        <CardHeader
          title="{session.remedial_groups?.name ?? 'Session'}"
          subtitle="{session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)} | {students.length} student(s)"
        >
          {#snippet action()}
            <button
              onclick={() => handleMarkAllPresent(session)}
              disabled={saving === session.id || students.length === 0}
              class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
            >
              {saving === session.id ? 'Saving...' : 'All Present'}
            </button>
          {/snippet}
        </CardHeader>
        <CardContent>
          <form method="POST" action="?/mark" use:enhance class="space-y-3">
            <input type="hidden" name="occurrence_id" value={session.occurrence_id} />
            <input type="hidden" name="student_ids" value={JSON.stringify(students.map((s: any) => s.id))} />
            <input type="hidden" name="statuses" value={JSON.stringify(attendanceState[session.id] ?? {})} />

            {#if students.length === 0}
              <p class="text-sm text-ink-400">No students enrolled in this group yet.</p>
            {:else}
              <div class="overflow-hidden rounded-xl border border-border">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-border bg-ink-50/70">
                      <th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">#</th>
                      <th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Student</th>
                      <th class="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each students as student, idx (student.id)}
                      <tr class="border-b border-border/70 transition-colors last:border-b-0 hover:bg-brand-50/40 {idx % 2 === 0 ? 'bg-white/60' : 'bg-ink-50/40'}">
                        <td class="px-4 py-2.5 text-ink-400">{idx + 1}</td>
                        <td class="px-4 py-2.5 text-ink-700">
                          {student.first_name} {student.last_name}
                          <span class="ml-2 text-xs text-ink-400">{student.admission_no}</span>
                        </td>
                        <td class="px-4 py-2.5 text-right">
                          <div class="inline-flex rounded-lg border border-border overflow-hidden">
                            {#each ['present', 'late', 'absent', 'excused'] as status}
                              <button
                                type="button"
                                onclick={() => setStatus(session.id, student.id, status)}
                                class="px-2.5 py-1.5 text-xs font-medium transition-colors {studentStatus(session, student.id) === status
                                  ? status === 'present' ? 'bg-brand-500 text-white'
                                    : status === 'late' ? 'bg-warning text-white'
                                    : status === 'absent' ? 'bg-danger text-white'
                                    : 'bg-ink-500 text-white'
                                  : 'bg-white text-ink-500 hover:bg-ink-50'}"
                              >
                                {status}
                              </button>
                            {/each}
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end pt-2">
                <Button type="submit" variant="primary" size="sm">Save Attendance</Button>
              </div>
            {/if}
          </form>
        </CardContent>
      </Card>
    {/each}
  {/if}
</DashboardContent>
