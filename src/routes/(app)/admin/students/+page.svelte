<script lang="ts">
  // @ts-nocheck
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { superForm, setMessage, setError } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Dialog } from 'bits-ui';
  import { Plus, Pencil, Trash2 } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData } from './$types';
  import { fly } from 'svelte/transition';

  const { data }: { data: PageData } = $props();

  const students = $derived(data.students);

  const { form, errors, message, reset } = superForm(data.form, {
    validators: zodClient(),
  });

  const studentForm = form;

  let showCreate = $state(false);
  let editingStudent = $state<any | null>(null);
  let deletingStudent = $state<any | null>(null);

  function openCreate() {
    reset();
    editingStudent = null;
    showCreate = true;
  }

  function openEdit(student: any) {
    editingStudent = student;
    reset({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      admission_no: student.admission_no,
      grade: student.grade ?? '',
      status: student.status,
    });
    showCreate = true;
  }

  function openDelete(student: any) {
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
    <a href="/admin/students/import" class="rounded-full bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600">Import</a>
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Add Student
    </button>
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
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog.Root open={showCreate} onOpenChange={(o: boolean) => { if (!o) closeCreate(); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated"
    >
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <Dialog.Title class="text-base font-semibold text-ink-900">
          {editingStudent ? 'Edit Student' : 'Add Student'}
        </Dialog.Title>
        <Dialog.Close class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Dialog.Close>
      </div>

      <form
        method="POST"
        action={editingStudent ? '?/update' : '?/create'}
        class="px-6 py-5 space-y-4"
      >
        {#if editingStudent}
          <input type="hidden" name="id" value={editingStudent.id} />
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="first_name" class="text-xs font-medium text-ink-700">First Name</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={studentForm.first_name}
              class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              placeholder="John"
            />
            {#if errors.first_name}
              <p class="text-xs text-danger">{errors.first_name}</p>
            {/if}
          </div>
          <div class="space-y-1.5">
            <label for="last_name" class="text-xs font-medium text-ink-700">Last Name</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={studentForm.last_name}
              class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              placeholder="Doe"
            />
            {#if errors.last_name}
              <p class="text-xs text-danger">{errors.last_name}</p>
            {/if}
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="admission_no" class="text-xs font-medium text-ink-700">Admission No</label>
          <input
            id="admission_no"
            name="admission_no"
            type="text"
            value={studentForm.admission_no}
            class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder="ADM-001"
          />
          {#if errors.admission_no}
            <p class="text-xs text-danger">{errors.admission_no}</p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <label for="grade" class="text-xs font-medium text-ink-700">Grade</label>
          <input
            id="grade"
            name="grade"
            type="text"
            value={studentForm.grade}
            class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder="Form 1"
          />
          {#if errors.grade}
            <p class="text-xs text-danger">{errors.grade}</p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <label for="status" class="text-xs font-medium text-ink-700">Status</label>
          <select
            id="status"
            name="status"
            value={studentForm.status}
            class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {#if errors.status}
            <p class="text-xs text-danger">{errors.status}</p>
          {/if}
        </div>

        {#if message}
          <div class="rounded-lg px-4 py-2 text-sm {message.success ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-danger'}">
            {message.text}
          </div>
        {/if}

        <div class="flex justify-end gap-3 pt-2">
          <Dialog.Close>
            <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
          </Dialog.Close>
          <Button type="submit" variant="primary" size="md">
            {editingStudent ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Delete Confirmation Modal -->
<Dialog.Root open={!!deletingStudent} onOpenChange={(o: boolean) => { if (!o) closeDelete(); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated"
    >
      <div class="px-6 py-5 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 class="h-6 w-6" />
        </div>
        <h3 class="text-base font-semibold text-ink-900">Delete Student</h3>
        <p class="mt-2 text-sm text-ink-500">
          Are you sure you want to delete <strong>{deletingStudent?.first_name} {deletingStudent?.last_name}</strong>? This action cannot be undone.
        </p>
      </div>

      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Dialog.Close>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        </Dialog.Close>
        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={deletingStudent?.id ?? ''} />
          <Button type="submit" variant="danger" size="md">Delete</Button>
        </form>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
