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

  interface Subject {
    id: string;
    name: string;
    code: string | null;
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
  }

  const { data }: { data: PageData } = $props();

  const subjects = $derived(data.subjects);

  let formData = $state<Record<string, unknown>>({});
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);

  let showCreate = $state(false);
  let editingSubject = $state<Subject | null>(null);
  let deletingSubject = $state<Subject | null>(null);

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
          editingSubject = null;
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
    editingSubject = null;
    showCreate = true;
  }

  function openEdit(s: Subject) {
    editingSubject = s;
    formData = {
      id: s.id,
      name: s.name,
      code: s.code ?? '',
    };
    showCreate = true;
  }

  function openDelete(s: Subject) {
    deletingSubject = s;
  }
</script>

<DashboardContent title="Subjects" subtitle="Academic subjects offered">
  {#snippet headerActions()}
    <Button onclick={openCreate} size="sm">
      <Plus class="h-3.5 w-3.5" /> Add Subject
    </Button>
  {/snippet}

  <DataTable
    data={subjects}
    columns={[
      { key: 'name', label: 'Name', sortable: true },
      { key: 'code', label: 'Code' },
    ]}
    emptyMessage="No subjects found"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingSubject = null; }}}>
  <DialogContent class="sm:max-w-lg p-0">
    <DialogHeader class="border-b border-border px-6 py-4">
      <DialogTitle class="text-base font-semibold text-foreground">{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
    </DialogHeader>

    <form method="POST" action={editingSubject ? '?/update' : '?/create'} use:enhance={handleSubmit} class="px-6 py-5 space-y-4">
      {#if editingSubject}
        <input type="hidden" name="id" value={editingSubject.id} />
      {/if}

      <div class="space-y-1.5">
        <label for="name" class="text-xs font-medium text-foreground">Name</label>
        <input id="name" name="name" type="text" bind:value={formData.name} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="Mathematics" />
        {#if errors.name?.[0]}<p class="text-xs text-destructive">{errors.name?.[0]}</p>{/if}
      </div>

      <div class="space-y-1.5">
        <label for="code" class="text-xs font-medium text-foreground">Code</label>
        <input id="code" name="code" type="text" bind:value={formData.code} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="MATH" />
        {#if errors.code?.[0]}<p class="text-xs text-destructive">{errors.code?.[0]}</p>{/if}
      </div>

      {#if msg}
        <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-destructive'}">{msg.text}</div>
      {/if}

      <DialogFooter class="pt-2">
        <DialogClose>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>{editingSubject ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Delete Confirmation Modal -->
<Dialog open={!!deletingSubject} onOpenChange={(o: boolean) => { if (!o) deletingSubject = null; }}>
  <DialogContent class="sm:max-w-sm p-0">
    <div class="px-6 py-5 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-destructive">
        <Trash2 class="h-6 w-6" />
      </div>
      <h3 class="text-base font-semibold text-foreground">Delete Subject</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Are you sure you want to delete <strong>{deletingSubject?.name}</strong>? This action cannot be undone.
      </p>
    </div>
    <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
      <DialogClose>
        <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={deletingSubject?.id ?? ''} />
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </div>
  </DialogContent>
</Dialog>
