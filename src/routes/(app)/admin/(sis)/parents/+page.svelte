<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { Dialog } from 'bits-ui';
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
    locale: string | null;
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
      locale: parent.locale ?? 'en',
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
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Add Parent
    </button>
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
<Dialog.Root open={showCreate} onOpenChange={(o: boolean) => { if (!o) closeCreate(); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated"
    >
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <Dialog.Title class="text-base font-semibold text-ink-900">
          {editingParent ? 'Edit Parent' : 'Add Parent'}
        </Dialog.Title>
        <Dialog.Close class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Dialog.Close>
      </div>

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
          <label for="full_name" class="text-xs font-medium text-ink-700">Full Name</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={formData.full_name}
            class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder="John Kamau"
          />
          {#if errors.full_name}
            <p class="text-xs text-danger">{errors.full_name?.[0]}</p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <label for="phone" class="text-xs font-medium text-ink-700">Phone</label>
          <input
            id="phone"
            name="phone"
            type="text"
            value={formData.phone}
            class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder="+254712345678"
          />
          {#if errors.phone}
            <p class="text-xs text-danger">{errors.phone?.[0]}</p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <label for="email" class="text-xs font-medium text-ink-700">Email (optional)</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder="parent@email.com"
          />
        </div>

        <div class="space-y-1.5">
          <label for="locale" class="text-xs font-medium text-ink-700">Locale</label>
          <select
            id="locale"
            name="locale"
            value={formData.locale}
            class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="en">English</option>
            <option value="sw">Swahili</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="sms_consent"
            name="sms_consent"
            type="checkbox"
            checked={(formData.sms_consent as boolean) ?? true}
            class="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
          />
          <label for="sms_consent" class="text-xs font-medium text-ink-700">SMS Consent</label>
        </div>

        {#if msg}
          <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-danger'}">
            {msg.text}
          </div>
        {/if}

        <div class="flex justify-end gap-3 pt-2">
          <Dialog.Close>
            <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
          </Dialog.Close>
          <Button type="submit" variant="primary" size="md" {submitting} disabled={submitting}>
            {editingParent ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Delete Confirmation Modal -->
<Dialog.Root open={!!deletingParent} onOpenChange={(o: boolean) => { if (!o) closeDelete(); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated"
    >
      <div class="px-6 py-5 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 class="h-6 w-6" />
        </div>
        <h3 class="text-base font-semibold text-ink-900">Delete Parent</h3>
        <p class="mt-2 text-sm text-ink-500">
          Are you sure you want to delete <strong>{deletingParent?.full_name}</strong>? This action cannot be undone.
        </p>
      </div>

      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Dialog.Close>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        </Dialog.Close>
        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={deletingParent?.id ?? ''} />
          <Button type="submit" variant="danger" size="md">Delete</Button>
        </form>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
