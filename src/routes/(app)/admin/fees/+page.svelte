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

  let { data }: { data: PageData } = $props();

  let fees = $derived(data.fees);

  const { form, errors, enhance: superEnhance, message, reset } = superForm(data.form, {
    validators: zodClient(),
  });

  const feeForm = form;

  let showCreate = $state(false);
  let editingFee = $state<any | null>(null);
  let deletingFee = $state<any | null>(null);

  function openCreate() {
    reset();
    editingFee = null;
    showCreate = true;
  }

  function openEdit(f: any) {
    editingFee = f;
    reset({
      id: f.id,
      name: f.name,
      amount: f.amount,
      grade: f.grade ?? '',
      frequency: f.frequency ?? '',
      status: f.status,
    });
    showCreate = true;
  }

  function openDelete(f: any) {
    deletingFee = f;
  }
</script>

<DashboardContent title="Fee structures" subtitle="Remedial fee definitions assigned to cohorts">
  {#snippet headerActions()}
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Add Fee
    </button>
  {/snippet}

  <DataTable
    data={fees}
    columns={[
      { key: 'name', label: 'Fee', sortable: true },
      { key: 'amount', label: 'Amount', render: (f: any) => `KES ${Number(f.amount).toLocaleString()}` },
      { key: 'grade', label: 'Cohort', sortable: true },
      { key: 'frequency', label: 'Cadence' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No remedial fee definitions yet"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog.Root open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingFee = null; }}}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <Dialog.Title class="text-base font-semibold text-ink-900">{editingFee ? 'Edit Fee' : 'Add Fee'}</Dialog.Title>
        <Dialog.Close class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </Dialog.Close>
      </div>

      <form method="POST" action={editingFee ? '?/update' : '?/create'} use:superEnhance class="px-6 py-5 space-y-4">
        {#if editingFee}
          <input type="hidden" name="id" value={editingFee.id} />
        {/if}

        <div class="space-y-1.5">
          <label for="name" class="text-xs font-medium text-ink-700">Fee Name</label>
          <input id="name" name="name" type="text" bind:value={feeForm.name} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Term 1 Remedial Fee" />
          {#if errors.name}<p class="text-xs text-danger">{errors.name}</p>{/if}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="amount" class="text-xs font-medium text-ink-700">Amount (KES)</label>
            <input id="amount" name="amount" type="number" step="0.01" bind:value={feeForm.amount} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="5000" />
            {#if errors.amount}<p class="text-xs text-danger">{errors.amount}</p>{/if}
          </div>
          <div class="space-y-1.5">
            <label for="grade" class="text-xs font-medium text-ink-700">Cohort / Grade</label>
            <input id="grade" name="grade" type="text" bind:value={feeForm.grade} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Form 1" />
            {#if errors.grade}<p class="text-xs text-danger">{errors.grade}</p>{/if}
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="frequency" class="text-xs font-medium text-ink-700">Frequency / Cadence</label>
          <input id="frequency" name="frequency" type="text" bind:value={feeForm.frequency} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Termly" />
          {#if errors.frequency}<p class="text-xs text-danger">{errors.frequency}</p>{/if}
        </div>

        <div class="space-y-1.5">
          <label for="status" class="text-xs font-medium text-ink-700">Status</label>
          <select id="status" name="status" bind:value={feeForm.status} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
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
          <Button type="submit" variant="primary" size="md">{editingFee ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Delete Confirmation Modal -->
<Dialog.Root open={!!deletingFee} onOpenChange={(o: boolean) => { if (!o) deletingFee = null; }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="px-6 py-5 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 class="h-6 w-6" />
        </div>
        <h3 class="text-base font-semibold text-ink-900">Delete Fee</h3>
        <p class="mt-2 text-sm text-ink-500">
          Are you sure you want to delete <strong>{deletingFee?.name}</strong>? This action cannot be undone.
        </p>
      </div>
      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Dialog.Close>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        </Dialog.Close>
        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={deletingFee?.id ?? ''} />
          <Button type="submit" variant="danger" size="md">Delete</Button>
        </form>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
