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

  interface IncomeRecord {
    id: string;
    description: string;
    amount: number;
    category: string;
    received_at: string | null;
    notes: string | null;
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
  }

  const { data }: { data: PageData } = $props();
  const income = $derived(data.income ?? []);
  const totalIncome = $derived(data.totalIncome ?? 0);
  const categoryBreakdown = $derived(data.categoryBreakdown ?? {});

  let formData = $state<Record<string, unknown>>({});
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);
  let showForm = $state(false);
  let editingRecord = $state<IncomeRecord | null>(null);
  let deletingRecord = $state<IncomeRecord | null>(null);
  let dateFilter = $state('');
  let categoryFilter = $state('');

  const filtered = $derived.by(() => {
    let result = income;
    if (dateFilter) {
      result = result.filter((r: any) => (r.received_at ?? '') >= dateFilter);
    }
    if (categoryFilter) {
      result = result.filter((r: any) => r.category === categoryFilter);
    }
    return result;
  });

  const categories = $derived([...new Set<string>(income.map((r: any) => r.category ?? 'other'))].sort());

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
          editingRecord = null;
          showForm = false;
        }
        update();
      } finally {
        submitting = false;
      }
    };
  }

  function openCreate() {
    formData = { category: 'other' };
    editingRecord = null;
    showForm = true;
  }

  function openEdit(r: IncomeRecord) {
    editingRecord = r;
    formData = {
      id: r.id,
      description: r.description,
      amount: r.amount,
      category: r.category,
      received_at: r.received_at ?? '',
      notes: r.notes ?? '',
    };
    showForm = true;
  }

  function openDelete(r: IncomeRecord) {
    deletingRecord = r;
  }
</script>

<DashboardContent title="Income Records" subtitle="School income beyond parent fees">
  {#snippet headerActions()}
    <Button onclick={openCreate} size="sm">
      <Plus class="h-3.5 w-3.5" /> Record Income
    </Button>
  {/snippet}

  <!-- Summary cards -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
    <div class="anim-card stagger-1 rounded-lg border border-slate-200 bg-white p-4">
      <p class="text-xs font-medium text-slate-500">Total Other Income</p>
      <p class="mt-1 text-2xl font-bold text-slate-900">KES {totalIncome.toLocaleString()}</p>
    </div>
    {#each Object.entries(categoryBreakdown) as [cat, amt], i}
      <div class="anim-card stagger-{Math.min(i + 2, 8)} rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-500">{cat}</p>
        <p class="mt-1 text-lg font-semibold text-slate-900">KES {Number(amt).toLocaleString()}</p>
      </div>
    {/each}
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap items-center gap-3">
    <select bind:value={categoryFilter} class="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
      <option value="">All categories</option>
      {#each categories as cat}
        <option value={cat}>{cat}</option>
      {/each}
    </select>
    <input type="date" bind:value={dateFilter} class="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
    {#if filtered.length !== income.length}
      <span class="text-xs text-muted-foreground">{filtered.length} of {income.length} shown</span>
    {/if}
  </div>

  {#if msg && !showForm}
    <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-danger'}">{msg.text}</div>
  {/if}

  <DataTable
    data={filtered}
    columns={[
      { key: 'description', label: 'Description', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'amount', label: 'Amount (KES)', render: (r: any) => `KES ${Number(r.amount).toLocaleString()}`, sortable: true },
      { key: 'received_at', label: 'Date', render: (r: any) => r.received_at ?? '—', sortable: true },
      { key: 'notes', label: 'Notes', render: (r: any) => r.notes ?? '—' },
    ]}
    emptyMessage="No income records yet"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog open={showForm} onOpenChange={(o: boolean) => { if (!o) { showForm = false; editingRecord = null; }}}>
  <DialogContent class="max-w-lg">
    <DialogHeader>
      <DialogTitle>{editingRecord ? 'Edit Income' : 'Record Income'}</DialogTitle>
    </DialogHeader>

    <form method="POST" action={editingRecord ? '?/update' : '?/create'} use:enhance={handleSubmit} class="px-6 py-5 space-y-4">
      {#if editingRecord}
        <input type="hidden" name="id" value={editingRecord.id} />
      {/if}

      <div class="space-y-1.5">
        <label for="description" class="text-xs font-medium text-foreground">Description</label>
        <input id="description" name="description" type="text" bind:value={formData.description} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="e.g. Bus hire, Lab fees, Donation" />
        {#if errors.description?.[0]}<p class="text-xs text-danger">{errors.description?.[0]}</p>{/if}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label for="amount" class="text-xs font-medium text-foreground">Amount (KES)</label>
          <input id="amount" name="amount" type="number" step="0.01" bind:value={formData.amount} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="5000" />
          {#if errors.amount?.[0]}<p class="text-xs text-danger">{errors.amount?.[0]}</p>{/if}
        </div>
        <div class="space-y-1.5">
          <label for="category" class="text-xs font-medium text-foreground">Category</label>
          <select id="category" name="category" bind:value={formData.category} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
            <option value="transport">Transport / Bus hire</option>
            <option value="lab">Lab fees</option>
            <option value="activity">Activity / Sports</option>
            <option value="library">Library</option>
            <option value="donation">Donation</option>
            <option value="other">Other</option>
          </select>
          {#if errors.category?.[0]}<p class="text-xs text-danger">{errors.category?.[0]}</p>{/if}
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="received_at" class="text-xs font-medium text-foreground">Date Received</label>
        <input id="received_at" name="received_at" type="date" bind:value={formData.received_at} class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" />
        {#if errors.received_at?.[0]}<p class="text-xs text-danger">{errors.received_at?.[0]}</p>{/if}
      </div>

      <div class="space-y-1.5">
        <label for="notes" class="text-xs font-medium text-foreground">Notes</label>
        <textarea id="notes" name="notes" bind:value={formData.notes} rows="2" class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="Optional notes"></textarea>
      </div>

      {#if msg}
        <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-danger'}">{msg.text}</div>
      {/if}

      <DialogFooter>
        <DialogClose>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>{editingRecord ? 'Update' : 'Record'}</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Delete Confirmation -->
<Dialog open={!!deletingRecord} onOpenChange={(o: boolean) => { if (!o) deletingRecord = null; }}>
  <DialogContent class="max-w-sm">
    <div class="px-6 py-5 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
        <Trash2 class="h-6 w-6" />
      </div>
      <h3 class="text-base font-semibold text-foreground">Delete Income Record</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Are you sure you want to delete <strong>{deletingRecord?.description}</strong>? This cannot be undone.
      </p>
    </div>
    <DialogFooter>
      <DialogClose>
        <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={deletingRecord?.id ?? ''} />
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>
