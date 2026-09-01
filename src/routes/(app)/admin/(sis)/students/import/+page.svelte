<script lang="ts">
  import { enhance } from '$app/forms';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';

  let result = $state<{ success?: boolean; count?: number; error?: string } | null>(null);
</script>

<DashboardContent title="Import Students" subtitle="Batch import students from CSV or JSON">
  <Card class="max-w-2xl">
    <CardContent class="p-6">
      <form method="POST" action="?/import" use:enhance={() => {
        return async ({ result: res, update }) => {
          if (res.type === 'success') {
            const data = res.data as any;
            if (data?.success) result = { success: true, count: data.count };
            else if (data?.error) result = { error: data.error };
            await update();
          } else if (res.type === 'failure') {
            const data = res.data as any;
            result = { error: data?.error ?? data?.message ?? 'Import failed — check file format' };
            await update();
          } else if (res.type === 'error') {
            result = { error: 'Import failed' };
          }
        };
      }}>
        <div class="space-y-4">
          <div>
            <label for="csv-file" class="text-sm font-medium text-slate-700">Upload CSV file</label>
            <input id="csv-file" type="file" name="file" accept=".csv" class="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
          <div class="text-sm text-slate-500">Or paste JSON records:</div>
          <div>
            <textarea name="records" rows="5" class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-mono" placeholder={JSON.stringify([{first_name:"John",last_name:"Doe",grade:"XII-A",admission_no:"2024001"}])}></textarea>
          </div>
          <Button type="submit">Import Students</Button>
        </div>
      </form>

      {#if result}
        <div class="mt-4">
          <Alert variant={result.success ? 'default' : 'destructive'}>
            <AlertTitle>{result.success ? 'Import complete' : 'Import failed'}</AlertTitle>
            <AlertDescription>
              {#if result.success}
                Successfully imported {result.count} students.
              {:else}
                {result.error}
              {/if}
            </AlertDescription>
          </Alert>
        </div>
      {/if}
    </CardContent>
  </Card>
</DashboardContent>
