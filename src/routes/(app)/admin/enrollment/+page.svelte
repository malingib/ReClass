<script lang="ts">
  // @ts-nocheck
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Dialog } from 'bits-ui';
  import { Plus, GraduationCap } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let enrollments = $derived(data.enrollments);
  let students = $derived(data.students);
  let groups = $derived(data.groups);

  const { form, errors, enhance: superEnhance, message, reset } = superForm(data.form, {
    validators: zodClient(),
  });

  const enrollmentForm = form;

  let showEnroll = $state(false);

  function openEnroll() {
    reset();
    showEnroll = true;
  }

  function closeEnroll() {
    showEnroll = false;
  }
</script>

<DashboardContent title="Enrollment" subtitle="Enroll students into remedial groups">
  {#snippet headerActions()}
    <button onclick={openEnroll} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Enroll Student
    </button>
  {/snippet}

  <!-- Enroll Form Card -->
  {#if showEnroll}
    <Card>
      <CardHeader title="Enroll a Student" subtitle="Select student and group">
        {#snippet action()}
          <button onclick={closeEnroll} class="text-xs text-ink-400 hover:text-ink-700">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/snippet}
      </CardHeader>
      <CardContent>
        <form method="POST" action="?/enroll" use:superEnhance class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label for="student_id" class="text-xs font-medium text-ink-700">Student</label>
              <select id="student_id" name="student_id" bind:value={enrollmentForm.student_id} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
                <option value="">Select student</option>
                {#each students as s}
                  <option value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>
                {/each}
              </select>
              {#if errors.student_id}<p class="text-xs text-danger">{errors.student_id}</p>{/if}
            </div>
            <div class="space-y-1.5">
              <label for="group_id" class="text-xs font-medium text-ink-700">Remedial Group</label>
              <select id="group_id" name="group_id" bind:value={enrollmentForm.group_id} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
                <option value="">Select group</option>
                {#each groups as g}
                  <option value={g.id}>{g.name} — {g.subject ?? g.grade} ({g.student_count ?? 0} enrolled)</option>
                {/each}
              </select>
              {#if errors.group_id}<p class="text-xs text-danger">{errors.group_id}</p>{/if}
            </div>
          </div>

          {#if message}
            <div class="rounded-lg px-4 py-2 text-sm {message.success ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-danger'}">{message.text}</div>
          {/if}

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" onclick={closeEnroll} class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
            <Button type="submit" variant="primary" size="md">
              <GraduationCap class="h-4 w-4" /> Enroll
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  {/if}

  <!-- Recently Enrolled Students List -->
  <DataTable
    data={enrollments}
    columns={[
      { key: 'admission_no', label: 'Adm No', sortable: true },
      { key: 'first_name', label: 'Name', render: (e: any) => `${e.first_name} ${e.last_name}` },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'created_at', label: 'Enrolled', render: (e: any) => e.created_at ? new Date(e.created_at).toLocaleDateString() : '—' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No enrolments yet"
  />
</DashboardContent>
