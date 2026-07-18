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

  const invoices = $derived(data.invoices);
  const students = $derived(data.students);

  const { form, errors, enhance: superEnhance, message, reset } = superForm(data.form, {
    validators: zodClient(),
  });

  const invoiceForm = form;

  let showCreate = $state(false);
  let editingInvoice = $state<any | null>(null);
  let deletingInvoice = $state<any | null>(null);

  function openCreate() {
    reset();
    editingInvoice = null;
    showCreate = true;
  }

  function openEdit(inv: any) {
    editingInvoice = inv;
    reset({
      id: inv.id,
      student_id: inv.student_id ?? '',
      amount_due: inv.amount_due,
      due_date: inv.due_date ?? '',
      status: inv.status,
    });
    showCreate = true;
  }

  function openDelete(inv: any) {
    deletingInvoice = inv;
  }
</script>

<DashboardContent title="Remedial invoices" subtitle="Invoices billed to parents for their children's remedial classes">
  {#snippet headerActions()}
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Add Invoice
    </button>
  {/snippet}

  <DataTable
    data={invoices}
    columns={[
      { key: 'students', label: 'Student', render: (i: any) => i.students ? `${i.students.first_name} ${i.students.last_name}` : '—' },
      { key: 'amount_due', label: 'Due', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}` },
      { key: 'amount_paid', label: 'Paid (M-Pesa)', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}` },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'due_date', label: 'Due', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—' },
    ]}
    emptyMessage="No remedial invoices issued yet"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog.Root open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingInvoice = null; }}}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <Dialog.Title class="text-base font-semibold text-ink-900">{editingInvoice ? 'Edit Invoice' : 'Add Invoice'}</Dialog.Title>
        <Dialog.Close class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </Dialog.Close>
      </div>

      <form method="POST" action={editingInvoice ? '?/update' : '?/create'} use:superEnhance class="px-6 py-5 space-y-4">
        {#if editingInvoice}
          <input type="hidden" name="id" value={editingInvoice.id} />
        {/if}

        <div class="space-y-1.5">
          <label for="student_id" class="text-xs font-medium text-ink-700">Student</label>
          <select id="student_id" name="student_id" bind:value={invoiceForm.student_id} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
            <option value="">Select a student</option>
            {#each students as s}
              <option value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>
            {/each}
          </select>
          {#if errors.student_id}<p class="text-xs text-danger">{errors.student_id}</p>{/if}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="amount_due" class="text-xs font-medium text-ink-700">Amount Due (KES)</label>
            <input id="amount_due" name="amount_due" type="number" step="0.01" bind:value={invoiceForm.amount_due} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="5000" />
            {#if errors.amount_due}<p class="text-xs text-danger">{errors.amount_due}</p>{/if}
          </div>
          <div class="space-y-1.5">
            <label for="due_date" class="text-xs font-medium text-ink-700">Due Date</label>
            <input id="due_date" name="due_date" type="date" bind:value={invoiceForm.due_date} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
            {#if errors.due_date}<p class="text-xs text-danger">{errors.due_date}</p>{/if}
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="status" class="text-xs font-medium text-ink-700">Status</label>
          <select id="status" name="status" bind:value={invoiceForm.status} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
            <option value="overpaid">Overpaid</option>
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
          <Button type="submit" variant="primary" size="md">{editingInvoice ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Delete Confirmation Modal -->
<Dialog.Root open={!!deletingInvoice} onOpenChange={(o: boolean) => { if (!o) deletingInvoice = null; }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="px-6 py-5 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 class="h-6 w-6" />
        </div>
        <h3 class="text-base font-semibold text-ink-900">Delete Invoice</h3>
        <p class="mt-2 text-sm text-ink-500">
          Are you sure you want to delete this invoice? This action cannot be undone.
        </p>
      </div>
      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Dialog.Close>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        </Dialog.Close>
        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={deletingInvoice?.id ?? ''} />
          <Button type="submit" variant="danger" size="md">Delete</Button>
        </form>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
