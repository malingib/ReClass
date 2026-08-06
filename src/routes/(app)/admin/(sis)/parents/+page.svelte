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

  interface Parent {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    sms_consent: boolean;
    created_at: string;
    students?: Array<{ id: string; first_name: string; last_name: string; admission_no: string; grade: string | null }>;
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
  }

  const { data }: { data: PageData } = $props();

  const parents = $derived(data.parents);

  let formData = $state<Record<string, unknown>>({});
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);

  let showCreate = $state(false);
  let editingParent = $state<Parent | null>(null);
  let deletingParent = $state<Parent | null>(null);

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
          editingParent = null;
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
    editingParent = null;
    showCreate = true;
  }

  function openEdit(parent: Parent) {
    editingParent = parent;
    formData = {
      id: parent.id,
      full_name: parent.full_name,
      phone: parent.phone,
      email: parent.email ?? '',
      sms_consent: parent.sms_consent ?? true,
    };
    showCreate = true;
  }

  function openDelete(parent: Parent) {
    deletingParent = parent;
  }

  function closeCreate() {
    showCreate = false;
    editingParent = null;
  }

  function closeDelete() {
    deletingParent = null;
  }

  function formatStudents(parent: any): string {
    if (!parent.students || parent.students.length === 0) return '—';
    return parent.students.map((s: any) => `${s.first_name} ${s.last_name} (${s.admission_no ?? ''})`).join(', ');
  }
</script>

<DashboardContent title="Parents" subtitle="Parent and guardian contacts">
  {#snippet headerActions()}
    <Button onclick={openCreate} size="sm">
      <Plus class="h-3.5 w-3.5" /> Add Parent
    </Button>
  {/snippet}

  <DataTable
    data={parents}
    columns={[
      { key: 'full_name', label: 'Name', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'students', label: 'Linked Students', render: (p: any) => formatStudents(p) },
    ]}
    emptyMessage="No parents found"
    onEdit={openEdit}
    onDelete={openDelete}
    server={{
      total: data.pagination.total,
      page: data.pagination.page,
      pageSize: data.pagination.pageSize,
      search: data.pagination.search,
      sortKey: data.pagination.sortKey,
      sortDir: data.pagination.sortDir,
    }}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog open={showCreate} onOpenChange={(o: boolean) => { if (!o) closeCreate(); }}>
  <DialogContent class="sm:max-w-lg p-0">
    <DialogHeader class="border-b border-border px-6 py-4">
      <DialogTitle class="text-base font-semibold text-foreground">
        {editingParent ? 'Edit Parent' : 'Add Parent'}
      </DialogTitle>
    </DialogHeader>

    <form
      method="POST"
      action={editingParent ? '?/update' : '?/create'}
      use:enhance={handleSubmit}
      class="px-6 py-5 space-y-4"
    >
      {#if editingParent}
        <input type="hidden" name="id" value={editingParent.id} />
      {/if}

      <div class="space-y-1.5">
        <label for="full_name" class="text-xs font-medium text-foreground">Full Name</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={formData.full_name}
          class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          placeholder="John Kamau"
        />
        {#if errors.full_name}
          <p class="text-xs text-destructive">{errors.full_name?.[0]}</p>
        {/if}
      </div>

      <div class="space-y-1.5">
        <label for="phone" class="text-xs font-medium text-foreground">Phone</label>
        <input
          id="phone"
          name="phone"
          type="text"
          value={formData.phone}
          class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          placeholder="+254712345678"
        />
        {#if errors.phone}
          <p class="text-xs text-destructive">{errors.phone?.[0]}</p>
        {/if}
      </div>

      <div class="space-y-1.5">
        <label for="email" class="text-xs font-medium text-foreground">Email (optional)</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          placeholder="parent@email.com"
        />
      </div>

      <div class="flex items-center gap-2">
        <input
          id="sms_consent"
          name="sms_consent"
          type="checkbox"
          checked={(formData.sms_consent as boolean) ?? true}
          class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <label for="sms_consent" class="text-xs font-medium text-foreground">SMS Consent</label>
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
          {editingParent ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Delete Confirmation Modal -->
<Dialog open={!!deletingParent} onOpenChange={(o: boolean) => { if (!o) closeDelete(); }}>
  <DialogContent class="sm:max-w-sm p-0">
    <div class="px-6 py-5 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-destructive">
        <Trash2 class="h-6 w-6" />
      </div>
      <h3 class="text-base font-semibold text-foreground">Delete Parent</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Are you sure you want to delete <strong>{deletingParent?.full_name}</strong>? This action cannot be undone.
      </p>
    </div>

    <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
      <DialogClose>
        <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={deletingParent?.id ?? ''} />
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </div>
  </DialogContent>
</Dialog>
