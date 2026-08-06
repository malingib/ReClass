<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '$lib/components/ui/dialog/index.js';
  import { Plus, Trash2 } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import type { ActionResult } from '@sveltejs/kit';
  import { dispatchToast } from '$lib/notifications';

  interface Teacher {
    id: string;
    first_name: string;
    last_name: string;
    employee_no: string | null;
    subjects: string[] | null;
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
  }

  const { data }: { data: PageData } = $props();

  const teachers = $derived(data.teachers);

  let formData = $state<Record<string, unknown>>({});
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);

  let showCreate = $state(false);
  let editingTeacher = $state<Teacher | null>(null);
  let deletingTeacher = $state<Teacher | null>(null);

  function handleSubmit() {
    submitting = true;
    errors = {};
    msg = null;
    return async ({ result, update }: { result: ActionResult<ActionData, ActionData>; update: (_opts?: { reset?: boolean }) => void }) => {
      try {
        if (result.type === 'failure' && result.data) {
          if (result.data.errors) errors = result.data.errors;
          if (result.data.message) msg = { type: 'error', text: result.data.message };
          dispatchToast('Error', result.data.message ?? 'Please fix the highlighted fields.');
        }
        if (result.type === 'error') {
          msg = { type: 'error', text: 'A network error occurred. Please check your connection and try again.' };
          dispatchToast('Network Error', 'Please check your connection.');
        }
        if (result.type === 'success') {
          msg = { type: 'success', text: result.data?.message ?? 'Saved' };
          dispatchToast('Saved', result.data?.message ?? 'Changes saved successfully.');
          formData = {};
          editingTeacher = null;
          showCreate = false;
        }
        update();
      } finally {
        submitting = false;
      }
    };
  }

  function openCreate() {
    formData = {};
    editingTeacher = null;
    showCreate = true;
  }

  function openEdit(t: Teacher) {
    editingTeacher = t;
    formData = {
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      employee_no: t.employee_no ?? '',
      subjects: t.subjects ? t.subjects.join(', ') : '',
    };
    showCreate = true;
  }

  function openDelete(t: Teacher) {
    deletingTeacher = t;
  }
</script>

<DashboardContent title="Teachers" subtitle="All teaching staff">
  {#snippet headerActions()}
    <Button onclick={openCreate} size="sm">
      <Plus class="h-3.5 w-3.5" /> Add Teacher
    </Button>
  {/snippet}

  <DataTable
    data={teachers}
    columns={[
      { key: 'first_name', label: 'Name', render: (t: any) => `${t.first_name} ${t.last_name}`, sortable: true },
      { key: 'employee_no', label: 'Employee No', sortable: true },
      { key: 'subjects', label: 'Subjects', render: (t: any) => t.subjects?.join(', ') ?? '—' },
    ]}
    emptyMessage="No teachers found"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingTeacher = null; }}}>
  <DialogContent class="sm:max-w-lg p-0">
    <DialogHeader class="border-b border-border px-6 py-4">
      <DialogTitle class="text-base font-semibold text-foreground">{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
    </DialogHeader>

    <form method="POST" action={editingTeacher ? '?/update' : '?/create'} use:enhance={handleSubmit} class="px-6 py-5 space-y-4">
      {#if editingTeacher}
        <input type="hidden" name="id" value={editingTeacher.id} />
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label for="first_name" class="text-xs font-medium text-foreground">First Name</label>
          <input id="first_name" name="first_name" type="text" bind:value={formData.first_name} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="Jane" />
          {#if errors.first_name}<p class="text-xs text-destructive">{errors.first_name?.[0]}</p>{/if}
        </div>
        <div class="space-y-1.5">
          <label for="last_name" class="text-xs font-medium text-foreground">Last Name</label>
          <input id="last_name" name="last_name" type="text" bind:value={formData.last_name} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="Smith" />
          {#if errors.last_name}<p class="text-xs text-destructive">{errors.last_name?.[0]}</p>{/if}
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="employee_no" class="text-xs font-medium text-foreground">Employee No</label>
        <input id="employee_no" name="employee_no" type="text" bind:value={formData.employee_no} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="TCH-001" />
        {#if errors.employee_no}<p class="text-xs text-destructive">{errors.employee_no?.[0]}</p>{/if}
      </div>

      <div class="space-y-1.5">
        <label for="subjects" class="text-xs font-medium text-foreground">Subjects (comma separated)</label>
        <input id="subjects" name="subjects" type="text" bind:value={formData.subjects} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="Math, English" />
        {#if errors.subjects}<p class="text-xs text-destructive">{errors.subjects?.[0]}</p>{/if}
      </div>

      {#if msg}
        <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-destructive'}">{msg.text}</div>
      {/if}

      <DialogFooter class="pt-2">
        <DialogClose>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>{editingTeacher ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Delete Confirmation Modal -->
<Dialog open={!!deletingTeacher} onOpenChange={(o: boolean) => { if (!o) deletingTeacher = null; }}>
  <DialogContent class="sm:max-w-sm p-0">
    <div class="px-6 py-5 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-destructive">
        <Trash2 class="h-6 w-6" />
      </div>
      <h3 class="text-base font-semibold text-foreground">Delete Teacher</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Are you sure you want to delete <strong>{deletingTeacher?.first_name} {deletingTeacher?.last_name}</strong>? This action cannot be undone.
      </p>
    </div>
    <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
      <DialogClose>
        <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={deletingTeacher?.id ?? ''} />
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </div>
  </DialogContent>
</Dialog>
