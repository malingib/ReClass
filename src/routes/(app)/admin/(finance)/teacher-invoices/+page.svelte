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

  interface Invoice {
    id: string;
    teacher_id: string;
    amount_due: number;
    amount_paid: number;
    status: string;
    period_start: string | null;
    period_end: string | null;
    occurrences_count: number;
    rate_per_session: number;
    due_date: string | null;
    notes: string | null;
    teacher_name?: string;
    employee_no?: string;
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
    error?: string;
    success?: boolean;
    count?: number;
    totalAmount?: number;
    periodStart?: string;
    periodEnd?: string;
  }

  const { data, form }: { data: PageData; form: ActionData | null } = $props();

  const invoices = $derived(data.invoices ?? []);
  const teachers = $derived(data.teachers ?? []);

  let formData = $state<Record<string, unknown>>({});
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);

  let showCreate = $state(false);
  let showGenerate = $state(false);
  let editingInvoice = $state<Invoice | null>(null);
  let deletingInvoice = $state<Invoice | null>(null);
  let periodStart = $state('');
  let periodEnd = $state('');

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
          msg = { type: 'error', text: 'A network error occurred.' };
          dispatchToast('Network Error', 'Please check your connection.');
        }
        if (result.type === 'success') {
          msg = { type: 'success', text: result.data?.message ?? 'Saved' };
          dispatchToast('Saved', result.data?.message ?? 'Changes saved successfully.');
          formData = {};
          editingInvoice = null;
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
    editingInvoice = null;
    showCreate = true;
  }

  function openEdit(inv: Invoice) {
    editingInvoice = inv;
    formData = {
      id: inv.id,
      teacher_id: inv.teacher_id ?? '',
      amount_due: inv.amount_due,
      period_start: inv.period_start ?? '',
      period_end: inv.period_end ?? '',
      occurrences_count: inv.occurrences_count,
      rate_per_session: inv.rate_per_session,
      due_date: inv.due_date ?? '',
      notes: inv.notes ?? '',
    };
    showCreate = true;
  }

  function openDelete(inv: Invoice) {
    deletingInvoice = inv;
  }

  function statusBadge(s: string) {
    const map: Record<string, string> = {
      draft: 'bg-ink-100 text-ink-600',
      unpaid: 'bg-amber-50 text-amber-700',
      paid: 'bg-success/10 text-success',
      cancelled: 'bg-red-50 text-red-600',
    };
    return map[s] ?? 'bg-ink-100 text-ink-500';
  }
</script>

<DashboardContent title="Teacher Invoices" subtitle="Payment records for remedial teachers">
  {#snippet headerActions()}
    <button onclick={() => showGenerate = !showGenerate} class="rounded-lg border border-border px-4 py-2 text-xs font-medium text-ink-600 hover:bg-ink-50">
      Generate from Payroll
    </button>
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Add Invoice
    </button>
  {/snippet}

  {#if form?.success}
    <div class="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
      {form.message ?? `${form.count} invoice(s) generated for ${form.periodStart} to ${form.periodEnd}.`}
    </div>
  {/if}
  {#if form?.error}
    <div class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  <!-- Generate from Payroll -->
  {#if showGenerate}
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h3 class="mb-4 text-sm font-semibold text-ink-800">Generate from Attendance</h3>
      <p class="mb-4 text-xs text-ink-500">Creates teacher invoices from approved attendance records in a date range.</p>
      <form method="POST" action="?/generate" use:enhance={() => {
        submitting = true;
        return async ({ result: _result }: any) => {
          submitting = false;
          showGenerate = false;
        };
      }}>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="period_start" class="mb-1.5 block text-sm font-medium text-ink-700">Period Start</label>
            <input id="period_start" name="period_start" type="date" bind:value={periodStart} required
              class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div>
            <label for="period_end" class="mb-1.5 block text-sm font-medium text-ink-700">Period End</label>
            <input id="period_end" name="period_end" type="date" bind:value={periodEnd} required
              class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
        </div>
        <div class="mt-5">
          <Button type="submit" variant="primary" loading={submitting}>Generate Invoices</Button>
        </div>
      </form>
    </div>
  {/if}

  <DataTable
    data={invoices}
    columns={[
      { key: 'teacher_name', label: 'Teacher', sortable: true },
      { key: 'employee_no', label: 'Emp No' },
      { key: 'amount_due', label: 'Amount', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}`, sortable: true },
      { key: 'amount_paid', label: 'Paid', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}`, sortable: true },
      {
        key: 'status', label: 'Status', sortable: true,
        render: (i: any) => `<span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadge(i.status)}">${i.status}</span>`,
      },
      {
        key: 'period', label: 'Period',
        render: (i: any) => i.period_start && i.period_end ? `${new Date(i.period_start).toLocaleDateString()} – ${new Date(i.period_end).toLocaleDateString()}` : '—',
      },
      { key: 'occurrences_count', label: 'Sessions' },
      { key: 'due_date', label: 'Due', render: (i: any) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—' },
    ]}
    emptyMessage="No teacher invoices yet. Create one manually or generate from attendance."
    onEdit={openEdit}
    editLabel={(inv: any) => (inv.status === 'draft' || inv.status === 'unpaid') ? 'Edit' : ''}
    onDelete={openDelete}
    deleteLabel="Delete"
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

      <form method="POST" action={editingInvoice ? '?/update' : '?/create'} use:enhance={handleSubmit} class="px-6 py-5 space-y-4">
        {#if editingInvoice}
          <input type="hidden" name="id" value={editingInvoice.id} />
        {/if}

        <div class="space-y-1.5">
          <label for="teacher_id" class="text-xs font-medium text-ink-700">Teacher</label>
          <select id="teacher_id" name="teacher_id" bind:value={formData.teacher_id} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
            <option value="">Select a teacher</option>
            {#each teachers as t}
              <option value={t.id}>{t.first_name} {t.last_name} ({t.employee_no ?? '—'})</option>
            {/each}
          </select>
          {#if errors.teacher_id?.[0]}<p class="text-xs text-danger">{errors.teacher_id?.[0]}</p>{/if}
        </div>

        <div class="space-y-1.5">
          <label for="amount_due" class="text-xs font-medium text-ink-700">Amount Due (KES)</label>
          <input id="amount_due" name="amount_due" type="number" step="0.01" bind:value={formData.amount_due} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="5000" />
          {#if errors.amount_due?.[0]}<p class="text-xs text-danger">{errors.amount_due?.[0]}</p>{/if}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="period_start" class="text-xs font-medium text-ink-700">Period Start</label>
            <input id="period_start" name="period_start" type="date" bind:value={formData.period_start} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div class="space-y-1.5">
            <label for="period_end" class="text-xs font-medium text-ink-700">Period End</label>
            <input id="period_end" name="period_end" type="date" bind:value={formData.period_end} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="occurrences_count" class="text-xs font-medium text-ink-700">Sessions</label>
            <input id="occurrences_count" name="occurrences_count" type="number" bind:value={formData.occurrences_count} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div class="space-y-1.5">
            <label for="rate_per_session" class="text-xs font-medium text-ink-700">Rate/Session (KES)</label>
            <input id="rate_per_session" name="rate_per_session" type="number" step="0.01" bind:value={formData.rate_per_session} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="due_date" class="text-xs font-medium text-ink-700">Due Date</label>
          <input id="due_date" name="due_date" type="date" bind:value={formData.due_date} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
        </div>

        <div class="space-y-1.5">
          <label for="notes" class="text-xs font-medium text-ink-700">Notes</label>
          <textarea id="notes" name="notes" bind:value={formData.notes} rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Optional notes"></textarea>
        </div>

        {#if msg}
          <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-danger'}">{msg.text}</div>
        {/if}

        <div class="flex justify-end gap-3 pt-2">
          <Dialog.Close>
            <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
          </Dialog.Close>
          <Button type="submit" variant="primary" size="md" {submitting} disabled={submitting}>{editingInvoice ? 'Update' : 'Create'}</Button>
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
          Are you sure you want to delete this teacher invoice? This action cannot be undone.
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
