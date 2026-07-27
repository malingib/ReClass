<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { enhance } from '$app/forms';
  import { applyAction } from '$app/forms';

  const { data } = $props();
  const exams = $derived(data.exams);

  let showForm = $state(false);
  let name = $state('');
  let term = $state('');
  let examDate = $state('');
  let maxScore = $state('100');
  let deleteTarget = $state<string | null>(null);
  let formSuccess = $state(false);

  function resetForm() {
    name = '';
    term = '';
    examDate = '';
    maxScore = '100';
    showForm = false;
  }

  function handleCreateSuccess() {
    formSuccess = true;
    resetForm();
    setTimeout(() => formSuccess = false, 3000);
  }
</script>

<DashboardContent title="Exams & Assessment" subtitle="Manage examinations and results">
  <div class="mb-4 flex justify-end">
    <button onclick={() => showForm = !showForm} class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
      {showForm ? 'Cancel' : 'New Exam'}
    </button>
  </div>

  {#if formSuccess}
    <div class="mb-4 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">Exam created successfully.</div>
  {/if}

  {#if showForm}
    <div class="mb-6 rounded-xl border border-border bg-white p-6 shadow-card">
      <h3 class="mb-4 text-sm font-semibold text-ink-900">Create Exam</h3>
      <form method="POST" action="?/create" use:enhance={() => async ({ result }) => { if (result.type === 'success') handleCreateSuccess(); return applyAction(result); }} class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="exam-name" class="block text-xs font-medium text-ink-500">Exam Name</label>
          <input bind:value={name} id="exam-name" name="name" required class="mt-1 w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label for="exam-term" class="block text-xs font-medium text-ink-500">Term</label>
          <input bind:value={term} id="exam-term" name="term" placeholder="e.g. Term 1" class="mt-1 w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label for="exam-date" class="block text-xs font-medium text-ink-500">Exam Date</label>
          <input bind:value={examDate} id="exam-date" name="exam_date" type="date" class="mt-1 w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label for="exam-max" class="block text-xs font-medium text-ink-500">Max Score</label>
          <input bind:value={maxScore} id="exam-max" name="max_score" type="number" step="0.01" required class="mt-1 w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div class="sm:col-span-2">
          <button type="submit" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Create Exam</button>
        </div>
      </form>
    </div>
  {/if}

  <div class="rounded-xl border border-border bg-white p-6 shadow-card">
    <DataTable
      data={exams}
      columns={[
        { key: 'name', label: 'Exam', sortable: true },
        { key: 'term', label: 'Term' },
        { key: 'exam_date', label: 'Date', render: (e: any) => e.exam_date ? new Date(e.exam_date).toLocaleDateString() : '—' },
        { key: 'max_score', label: 'Max Score' },
      ]}
      emptyMessage="No exams created yet"
    />
  </div>

  {#if deleteTarget}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 class="text-sm font-semibold text-ink-900">Delete Exam?</h3>
        <p class="mt-2 text-sm text-ink-600">This will also delete all associated results.</p>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button onclick={() => deleteTarget = null} class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
          <form method="POST" action="?/delete">
            <input type="hidden" name="id" value={deleteTarget} />
            <button type="submit" class="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90">Delete</button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</DashboardContent>
