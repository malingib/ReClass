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

  interface Student {
    id: string;
    first_name: string;
    last_name: string;
    admission_no: string;
    grade: string | null;
    status: string;
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
  }

  const { data }: { data: PageData } = $props();

  const students = $derived(data.students);
  const pagination = $derived(data.pagination);

  let formData = $state<Record<string, unknown>>({});
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);

  let showCreate = $state(false);
  let editingStudent = $state<Student | null>(null);
  let deletingStudent = $state<Student | null>(null);

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
          editingStudent = null;
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
    editingStudent = null;
    showCreate = true;
  }

  function openEdit(student: Student) {
    editingStudent = student;
    formData = {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      admission_no: student.admission_no,
      grade: student.grade ?? '',
      status: student.status,
    };
    showCreate = true;
  }

  function openDelete(student: Student) {
    deletingStudent = student;
  }

  function closeCreate() {
    showCreate = false;
    editingStudent = null;
  }

  function closeDelete() {
    deletingStudent = null;
  }
</script>

<DashboardContent title="Students" subtitle="All enrolled students">
  {#snippet headerActions()}
    <Button href="/admin/students/import" size="sm" variant="outline">Import</Button>
    <Button onclick={openCreate} size="sm">
      <Plus class="h-3.5 w-3.5" /> Add Student
    </Button>
  {/snippet}

  <DataTable
    data={students}
    columns={[
      { key: 'admission_no', label: 'Adm No', sortable: true },
      { key: 'first_name', label: 'Name', render: (s: any) => `${s.first_name} ${s.last_name}` },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No students found"
    onEdit={openEdit}
    onDelete={openDelete}
    server={{
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: pagination.search,
      sortKey: pagination.sortKey,
      sortDir: pagination.sortDir,
    }}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog open={showCreate} onOpenChange={(o: boolean) => { if (!o) closeCreate(); }}>
  <DialogContent class="sm:max-w-lg p-0">
    <DialogHeader class="border-b border-border px-6 py-4">
      <DialogTitle class="text-base font-semibold text-foreground">
        {editingStudent ? 'Edit Student' : 'Add Student'}
      </DialogTitle>
    </DialogHeader>

    <form
      method="POST"
      action={editingStudent ? '?/update' : '?/create'}
      class="px-6 py-5 space-y-4"
      use:enhance={handleSubmit}
    >
      {#if editingStudent}
        <input type="hidden" name="id" value={editingStudent.id} />
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label for="first_name" class="text-xs font-medium text-foreground">First Name</label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            value={formData.first_name}
            class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            placeholder="John"
          />
          {#if errors.first_name?.[0]}
            <p class="text-xs text-destructive">{errors.first_name?.[0]}</p>
          {/if}
        </div>
        <div class="space-y-1.5">
          <label for="last_name" class="text-xs font-medium text-foreground">Last Name</label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            value={formData.last_name}
            class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            placeholder="Doe"
          />
          {#if errors.last_name?.[0]}
            <p class="text-xs text-destructive">{errors.last_name?.[0]}</p>
          {/if}
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="admission_no" class="text-xs font-medium text-foreground">Admission No</label>
        <input
          id="admission_no"
          name="admission_no"
          type="text"
          value={formData.admission_no}
          class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          placeholder="ADM-001"
        />
        {#if errors.admission_no?.[0]}
          <p class="text-xs text-destructive">{errors.admission_no?.[0]}</p>
        {/if}
      </div>

      <div class="space-y-1.5">
        <label for="grade" class="text-xs font-medium text-foreground">Grade</label>
        <input
          id="grade"
          name="grade"
          type="text"
          value={formData.grade}
          class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          placeholder="Form 1"
        />
        {#if errors.grade?.[0]}
          <p class="text-xs text-destructive">{errors.grade?.[0]}</p>
        {/if}
      </div>

      <div class="space-y-1.5">
        <label for="status" class="text-xs font-medium text-foreground">Status</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {#if errors.status?.[0]}
          <p class="text-xs text-destructive">{errors.status?.[0]}</p>
        {/if}
      </div>

      {#if msg}
        <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-destructive'}">
          {msg.text}
        </div>
      {/if}

      <DialogFooter class="pt-2">
        <DialogClose>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>
          {editingStudent ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Delete Confirmation Modal -->
<Dialog open={!!deletingStudent} onOpenChange={(o: boolean) => { if (!o) closeDelete(); }}>
  <DialogContent class="sm:max-w-sm p-0">
    <div class="px-6 py-5 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-destructive">
        <Trash2 class="h-6 w-6" />
      </div>
      <h3 class="text-base font-semibold text-foreground">Delete Student</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Are you sure you want to delete <strong>{deletingStudent?.first_name} {deletingStudent?.last_name}</strong>? This action cannot be undone.
      </p>
    </div>

    <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
      <DialogClose>
        <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={deletingStudent?.id ?? ''} />
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </div>
  </DialogContent>
</Dialog>
