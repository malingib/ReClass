<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();
  const exam = $derived(data.exam);
  const students = $derived(data.students);
  const subjects = $derived(data.subjects);
  const existingResults = $derived(data.existingResults);

  const entries = $state<Record<string, { score: string; grade: string; remarks: string }>>({});
  let saving = $state(false);

  $effect(() => {
    if (entries) return;
  });

  function getKey(studentId: string, subjectId: string) { return `${studentId}_${subjectId}`; }

  function getEntry(studentId: string, subjectId: string) {
    const key = getKey(studentId, subjectId);
    if (!entries[key]) {
      const existing = existingResults.find((r: any) => r.student_id === studentId && r.subject_id === subjectId);
      entries[key] = {
        score: existing ? String(existing.score) : '',
        grade: existing?.grade ?? '',
        remarks: existing?.remarks ?? '',
      };
    }
    return entries[key];
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    const resultEntries: any[] = [];
    for (const student of students) {
      for (const subject of subjects) {
        const entry = getEntry(student.id, subject.id);
        if (entry.score !== '') {
          resultEntries.push({
            student_id: student.id,
            subject_id: subject.id,
            score: parseFloat(entry.score),
            grade: entry.grade || null,
            remarks: entry.remarks || null,
          });
        }
      }
    }
    const fd = new FormData();
    fd.set('entries', JSON.stringify(resultEntries));
    const resp = await fetch(window.location.href, {
      method: 'POST',
      body: fd,
    });
    if (resp.ok) {
      window.location.href = `/admin/academic/${(exam as any)?.id}`;
    }
    saving = false;
  }
</script>

<DashboardContent title={`Results: ${exam?.name ?? ''}`} subtitle="Enter scores per student and subject">
  <form onsubmit={handleSubmit}>
    <div class="overflow-x-auto rounded-xl border border-border bg-white shadow-card">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-ink-50">
            <th class="sticky left-0 bg-ink-50 px-4 py-3 text-left font-medium text-ink-700">Student</th>
            {#each subjects as subject}
              <th class="px-4 py-3 text-center font-medium text-ink-700">{subject.name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each students as student}
            <tr class="border-b border-border last:border-0">
              <td class="sticky left-0 bg-white px-4 py-3 font-medium text-ink-900">
                {student.first_name} {student.last_name}
                <span class="ml-1 text-xs text-ink-400">({student.admission_no})</span>
              </td>
              {#each subjects as subject}
                {@const entry = getEntry(student.id, subject.id)}
                <td class="px-4 py-3">
                  <div class="flex flex-col items-center gap-1">
                    <input
                      bind:value={entry.score}
                      type="number"
                      step="0.01"
                      min="0"
                      max={((exam as any)?.max_score ?? 100) as number}
                      placeholder="—"
                      class="w-20 rounded border border-border px-2 py-1 text-center text-sm focus:border-brand-500 focus:outline-none"
                    />
                    <input
                      bind:value={entry.grade}
                      placeholder="Grade"
                      class="w-16 rounded border border-border px-2 py-1 text-center text-xs text-ink-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="mt-4 flex justify-end gap-3">
      <a href="/admin/academic/{exam?.id}" class="rounded-lg border border-border px-4 py-2 text-sm text-ink-600 hover:bg-ink-50">Cancel</a>
      <button type="submit" disabled={saving} class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Results'}
      </button>
    </div>
  </form>
</DashboardContent>
