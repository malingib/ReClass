<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const exam = $derived(data.exam);
  const results = $derived(data.results ?? []);
</script>

<DashboardContent title={exam?.name ?? 'Exam'} subtitle={exam ? `Max Score: ${exam.max_score}${exam.term ? ` | ${exam.term}` : ''}` : 'Not found'}>
  {#if !exam}
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <p class="text-sm text-ink-500">Exam not found.</p>
    </div>
  {:else}
    <div class="mb-4 flex justify-end">
      <a href="/admin/academic/{exam.id}/edit" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Enter / Edit Results</a>
    </div>
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <DataTable
        data={results}
        columns={[
          { key: 'student_name', label: 'Student', sortable: true },
          { key: 'subject_name', label: 'Subject' },
          { key: 'score', label: 'Score' },
          { key: 'grade', label: 'Grade' },
          { key: 'remarks', label: 'Remarks' },
        ]}
        emptyMessage="No results entered yet"
      />
    </div>
  {/if}
</DashboardContent>
