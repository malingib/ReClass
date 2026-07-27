<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();
  const students = $derived(data.students);
  const results = $derived(data.results);

  let selectedStudent = $state<string | null>(null);

  function studentResults(studentId: string) {
    return results.filter((r: any) => r.student_id === studentId);
  }

  function groupedByExam(studentId: string) {
    const map = new Map<string, any[]>();
    for (const r of studentResults(studentId)) {
      const examName = r.exams?.name ?? 'Unknown Exam';
      if (!map.has(examName)) map.set(examName, []);
      map.get(examName)!.push(r);
    }
    return [...map.entries()];
  }
</script>

<DashboardContent title="Academic Reports" subtitle="Exam results and report cards for your children">
  <div class="grid gap-6 lg:grid-cols-3">
    <div class="lg:col-span-1">
      <div class="rounded-xl border border-border bg-white p-4 shadow-card">
        <h3 class="mb-3 text-sm font-semibold text-ink-900">Students</h3>
        {#if students.length === 0}
          <p class="text-sm text-ink-500">No students linked to your account.</p>
        {:else}
          <div class="space-y-2">
            {#each students as s}
              <button onclick={() => selectedStudent = s.id}
                class="w-full rounded-lg px-4 py-3 text-left transition {selectedStudent === s.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-ink-50'}">
                <p class="text-sm font-medium text-ink-900">{s.first_name} {s.last_name}</p>
                <p class="text-xs text-ink-500">{s.admission_no} &middot; {s.grade ?? '—'}</p>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="lg:col-span-2">
      {#if selectedStudent}
        {@const groups = groupedByExam(selectedStudent)}
        {#if groups.length === 0}
          <div class="rounded-xl border border-border bg-white p-6 shadow-card">
            <p class="text-sm text-ink-500">No exam results available for this student.</p>
          </div>
        {:else}
          {#each groups as [examName, examResults]}
            <div class="mb-4 rounded-xl border border-border bg-white p-6 shadow-card">
              <h3 class="mb-3 text-sm font-semibold text-ink-900">{examName}
                {#if examResults[0]?.exams?.term}
                  <span class="ml-2 font-normal text-ink-400">({examResults[0].exams.term})</span>
                {/if}
                {#if examResults[0]?.exams?.exam_date}
                  <span class="ml-2 font-normal text-ink-400">&middot; {new Date(examResults[0].exams.exam_date).toLocaleDateString()}</span>
                {/if}
                <span class="ml-2 font-normal text-ink-400">&middot; Max: {examResults[0]?.exams?.max_score ?? 100}</span>
              </h3>
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border text-left text-xs font-medium text-ink-500">
                    <th class="pb-2 pr-4">Subject</th>
                    <th class="pb-2 pr-4">Score</th>
                    <th class="pb-2 pr-4">Grade</th>
                    <th class="pb-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {#each examResults as r}
                    <tr class="border-b border-border last:border-0">
                      <td class="py-2 pr-4 font-medium text-ink-900">{r.subject_name}</td>
                      <td class="py-2 pr-4 text-ink-700">{r.score}</td>
                      <td class="py-2 pr-4">
                        <span class="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{r.grade ?? '—'}</span>
                      </td>
                      <td class="py-2 text-ink-500">{r.remarks ?? '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/each}
        {/if}
      {:else}
        <div class="flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-canvas">
          <p class="text-sm text-ink-400">Select a student to view their academic performance</p>
        </div>
      {/if}
    </div>
  </div>
</DashboardContent>
