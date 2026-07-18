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

  const subjects = $derived(data.subjects);

  const { form, errors, enhance: superEnhance, message, reset } = superForm(data.form, {
    validators: zodClient(),
  });

  const subjectForm = form;

  let showCreate = $state(false);
  let editingSubject = $state<any | null>(null);
  let deletingSubject = $state<any | null>(null);

  function openCreate() {
    reset();
    editingSubject = null;
    showCreate = true;
  }

  function openEdit(s: any) {
    editingSubject = s;
    reset({
      id: s.id,
      name: s.name,
      code: s.code ?? '',
      description: s.description ?? '',
      status: s.status,
    });
    showCreate = true;
  }

  function openDelete(s: any) {
    deletingSubject = s;
  }
</script>

<DashboardContent title="Subjects" subtitle="Academic subjects offered">
  {#snippet headerActions()}
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Add Subject
    </button>
  {/snippet}

  <DataTable
    data={subjects}
    columns={[
      { key: 'name', label: 'Name', sortable: true },
      { key: 'code', label: 'Code' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No subjects found"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog.Root open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingSubject = null; }}}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <Dialog.Title class="text-base font-semibold text-ink-900">{editingSubject ? 'Edit Subject' : 'Add Subject'}</Dialog.Title>
        <Dialog.Close class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </Dialog.Close>
      </div>

      <form method="POST" action={editingSubject ? '?/update' : '?/create'} use:superEnhance class="px-6 py-5 space-y-4">
        {#if editingSubject}
          <input type="hidden" name="id" value={editingSubject.id} />
        {/if}

        <div class="space-y-1.5">
          <label for="name" class="text-xs font-medium text-ink-700">Name</label>
          <input id="name" name="name" type="text" bind:value={subjectForm.name} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Mathematics" />
          {#if errors.name}<p class="text-xs text-danger">{errors.name}</p>{/if}
        </div>

        <div class="space-y-1.5">
          <label for="code" class="text-xs font-medium text-ink-700">Code</label>
          <input id="code" name="code" type="text" bind:value={subjectForm.code} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="MATH" />
          {#if errors.code}<p class="text-xs text-danger">{errors.code}</p>{/if}
        </div>

        <div class="space-y-1.5">
          <label for="description" class="text-xs font-medium text-ink-700">Description</label>
          <textarea id="description" name="description" bind:value={subjectForm.description} rows={2} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Brief description..."></textarea>
          {#if errors.description}<p class="text-xs text-danger">{errors.description}</p>{/if}
        </div>

        <div class="space-y-1.5">
          <label for="status" class="text-xs font-medium text-ink-700">Status</label>
          <select id="status" name="status" bind:value={subjectForm.status} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
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
          <Button type="submit" variant="primary" size="md">{editingSubject ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Delete Confirmation Modal -->
<Dialog.Root open={!!deletingSubject} onOpenChange={(o: boolean) => { if (!o) deletingSubject = null; }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="px-6 py-5 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 class="h-6 w-6" />
        </div>
        <h3 class="text-base font-semibold text-ink-900">Delete Subject</h3>
        <p class="mt-2 text-sm text-ink-500">
          Are you sure you want to delete <strong>{deletingSubject?.name}</strong>? This action cannot be undone.
        </p>
      </div>
      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Dialog.Close>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        </Dialog.Close>
        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={deletingSubject?.id ?? ''} />
          <Button type="submit" variant="danger" size="md">Delete</Button>
        </form>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
