<script lang="ts">
  // @ts-nocheck
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Dialog } from 'bits-ui';
  import { Plus, Trash2 } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  const { data }: { data: PageData } = $props();

  const teachers = $derived(data.teachers);

  const { form, errors, enhance: superEnhance, message, reset } = superForm(data.form, {
    validators: zodClient(),
  });

  const teacherForm = form;

  let showCreate = $state(false);
  let editingTeacher = $state<any | null>(null);
  let deletingTeacher = $state<any | null>(null);

  function openCreate() {
    reset();
    editingTeacher = null;
    showCreate = true;
  }

  function openEdit(t: any) {
    editingTeacher = t;
    reset({
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      email: t.email ?? '',
      phone: t.phone ?? '',
      subjects: t.subjects ? t.subjects.join(', ') : '',
      status: t.status,
    });
    showCreate = true;
  }

  function openDelete(t: any) {
    deletingTeacher = t;
  }
</script>

<DashboardContent title="Teachers" subtitle="All teaching staff">
  {#snippet headerActions()}
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Add Teacher
    </button>
  {/snippet}

  <DataTable
    data={teachers}
    columns={[
      { key: 'first_name', label: 'Name', render: (t: any) => `${t.first_name} ${t.last_name}`, sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'subjects', label: 'Subjects', render: (t: any) => t.subjects?.join(', ') ?? '—' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No teachers found"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog.Root open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingTeacher = null; }}}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <Dialog.Title class="text-base font-semibold text-ink-900">{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</Dialog.Title>
        <Dialog.Close class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </Dialog.Close>
      </div>

      <form method="POST" action={editingTeacher ? '?/update' : '?/create'} use:superEnhance class="px-6 py-5 space-y-4">
        {#if editingTeacher}
          <input type="hidden" name="id" value={editingTeacher.id} />
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="first_name" class="text-xs font-medium text-ink-700">First Name</label>
            <input id="first_name" name="first_name" type="text" bind:value={teacherForm.first_name} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Jane" />
            {#if errors.first_name}<p class="text-xs text-danger">{errors.first_name}</p>{/if}
          </div>
          <div class="space-y-1.5">
            <label for="last_name" class="text-xs font-medium text-ink-700">Last Name</label>
            <input id="last_name" name="last_name" type="text" bind:value={teacherForm.last_name} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Smith" />
            {#if errors.last_name}<p class="text-xs text-danger">{errors.last_name}</p>{/if}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="email" class="text-xs font-medium text-ink-700">Email</label>
            <input id="email" name="email" type="email" bind:value={teacherForm.email} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="jane@school.com" />
            {#if errors.email}<p class="text-xs text-danger">{errors.email}</p>{/if}
          </div>
          <div class="space-y-1.5">
            <label for="phone" class="text-xs font-medium text-ink-700">Phone</label>
            <input id="phone" name="phone" type="text" bind:value={teacherForm.phone} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="+2547XX" />
            {#if errors.phone}<p class="text-xs text-danger">{errors.phone}</p>{/if}
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="subjects" class="text-xs font-medium text-ink-700">Subjects (comma separated)</label>
          <input id="subjects" name="subjects" type="text" bind:value={teacherForm.subjects} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Math, English" />
          {#if errors.subjects}<p class="text-xs text-danger">{errors.subjects}</p>{/if}
        </div>

        <div class="space-y-1.5">
          <label for="status" class="text-xs font-medium text-ink-700">Status</label>
          <select id="status" name="status" bind:value={teacherForm.status} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {#if errors.status}<p class="text-xs text-danger">{errors.status}</p>{/if}
        </div>

        {#if message}
          <div class="rounded-lg px-4 py-2 text-sm {message.success ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-danger'}">{message.text}</div>
        {/if}

        <div class="flex justify-end gap-3 pt-2">
          <Dialog.Close>
            <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
          </Dialog.Close>
          <Button type="submit" variant="primary" size="md">{editingTeacher ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Delete Confirmation Modal -->
<Dialog.Root open={!!deletingTeacher} onOpenChange={(o: boolean) => { if (!o) deletingTeacher = null; }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="px-6 py-5 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 class="h-6 w-6" />
        </div>
        <h3 class="text-base font-semibold text-ink-900">Delete Teacher</h3>
        <p class="mt-2 text-sm text-ink-500">
          Are you sure you want to delete <strong>{deletingTeacher?.first_name} {deletingTeacher?.last_name}</strong>? This action cannot be undone.
        </p>
      </div>
      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Dialog.Close>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        </Dialog.Close>
        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={deletingTeacher?.id ?? ''} />
          <Button type="submit" variant="danger" size="md">Delete</Button>
        </form>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
