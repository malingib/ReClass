<script lang="ts">
  import { enhance } from '$app/forms';
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  let result = $state<{ success?: boolean; count?: number; error?: string } | null>(null);
</script>

<DashboardContent title="Import Students" subtitle="Batch import students from CSV or JSON">
  <div class="rounded-xl border border-border bg-white p-6 shadow-card">
    <form method="POST" action="?/import" use:enhance={() => {
      return async ({ result: res }) => {
        if (res.type === 'success') {
          const data = res.data as any;
          if (data.success) {
            result = { success: true, count: data.count };
          } else if (data.error) {
            result = { error: data.error };
          }
        } else if (res.type === 'error') {
          result = { error: 'Import failed' };
        }
      };
    }}>
      <div class="space-y-4">
        <div>
          <label for="csv-file" class="text-sm font-medium text-ink-700">Upload CSV file</label>
          <input id="csv-file" type="file" name="file" accept=".csv" class="mt-1 block w-full rounded-xl border border-border px-3 py-2 text-sm" />
        </div>
        <div class="text-sm text-ink-400">Or paste JSON records:</div>
        <div>
          <textarea name="records" rows="5" class="w-full rounded-xl border border-border px-3 py-2 text-sm font-mono" placeholder={JSON.stringify([{first_name:"John",last_name:"Doe",grade:"XII-A",admission_no:"2024001"}])}></textarea>
        </div>
        <button type="submit" class="rounded-full bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600">
          Import Students
        </button>
      </div>
    </form>

    {#if result}
      <div class="mt-4 rounded-xl p-4 {result.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}">
        {#if result.success}
          Successfully imported {result.count} students.
        {:else}
          {result.error}
        {/if}
      </div>
    {/if}
  </div>
</DashboardContent>
