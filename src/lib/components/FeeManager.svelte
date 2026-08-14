<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '$lib/components/ui/dialog/index.js';
  import { Plus, Trash2 } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { ActionResult } from '@sveltejs/kit';
  import { dispatchToast } from '$lib/notifications';

  interface Fee { id: string; name: string; amount: number; due_date: string | null; term: string | null }
  interface ActionData extends Record<string, unknown> { message?: string; errors?: Record<string, string[]> }

  const { title, subtitle, emptyMessage, fees }: {
    title: string; subtitle: string; emptyMessage: string; fees: Fee[];
  } = $props();

  let formData = $state<Record<string, unknown>>({});
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);
  let showCreate = $state(false);
  let editingFee = $state<Fee | null>(null);
  let deletingFee = $state<Fee | null>(null);

  function handleSubmit() {
    submitting = true; errors = {}; msg = null;
    return async ({ result, update }: { result: ActionResult<ActionData, ActionData>; update: (_o?: { reset?: boolean }) => void }) => {
      try {
        if (result.type === 'failure' && result.data) {
          if (result.data.errors) errors = result.data.errors;
          if (result.data.message) dispatchToast('Error', result.data.message);
        }
        if (result.type === 'error') dispatchToast('Network Error', 'Check your connection.');
        if (result.type === 'success') {
          msg = { type: 'success', text: result.data?.message ?? 'Saved' };
          dispatchToast('Saved', result.data?.message ?? 'Changes saved.');
          formData = {}; editingFee = null; showCreate = false;
        }
        await update();
      } finally { submitting = false; }
    };
  }

  const openCreate = () => { formData = {}; editingFee = null; showCreate = true; };
  const openEdit = (f: Fee) => { editingFee = f; formData = { id: f.id, name: f.name, amount: f.amount, due_date: f.due_date ?? '', term: f.term ?? '' }; showCreate = true; };
  const openDelete = (f: Fee) => { deletingFee = f; };
</script>

<DashboardContent {title} {subtitle}>
  {#snippet headerActions()}
    <Button onclick={openCreate} size="sm">
      <Plus class="h-3.5 w-3.5" /> Add Fee
    </Button>
  {/snippet}

  <DataTable
    data={fees}
    columns={[
      { key: 'name', label: 'Fee', sortable: true },
      { key: 'amount', label: 'Amount', render: (f: any) => `KES ${Number(f.amount).toLocaleString()}` },
      { key: 'due_date', label: 'Due Date', sortable: true },
      { key: 'term', label: 'Term', sortable: true },
    ]}
    {emptyMessage}
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<Dialog open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingFee = null; } }}>
  <DialogContent class="sm:max-w-lg p-0">
    <DialogHeader class="border-b border-slate-200 px-6 py-4">
      <DialogTitle class="text-base font-semibold">{editingFee ? 'Edit Fee' : 'Add Fee'}</DialogTitle>
    </DialogHeader>

    <form method="POST" action={editingFee ? '?/update' : '?/create'} use:enhance={handleSubmit} class="px-6 py-5 space-y-4">
      {#if editingFee}<input type="hidden" name="id" value={editingFee.id} />{/if}

      <div class="space-y-1.5">
        <Label for="name">Fee Name</Label>
        <Input id="name" name="name" type="text" bind:value={formData.name} placeholder="Term 1 Fee" />
        {#if errors.name?.[0]}<p class="text-xs text-destructive">{errors.name?.[0]}</p>{/if}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <Label for="amount">Amount (KES)</Label>
          <Input id="amount" name="amount" type="number" step="0.01" bind:value={formData.amount} placeholder="5000" />
          {#if errors.amount?.[0]}<p class="text-xs text-destructive">{errors.amount?.[0]}</p>{/if}
        </div>
        <div class="space-y-1.5">
          <Label for="due_date">Due Date</Label>
          <Input id="due_date" name="due_date" type="date" bind:value={formData.due_date} />
          {#if errors.due_date?.[0]}<p class="text-xs text-destructive">{errors.due_date?.[0]}</p>{/if}
        </div>
      </div>

      <div class="space-y-1.5">
        <Label for="term">Term</Label>
        <Input id="term" name="term" type="text" bind:value={formData.term} placeholder="Term 1, 2026" />
        {#if errors.term?.[0]}<p class="text-xs text-destructive">{errors.term?.[0]}</p>{/if}
      </div>

      {#if msg}<div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-destructive'}">{msg.text}</div>{/if}

      <DialogFooter>
        <DialogClose>
          <button type="button" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>{editingFee ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<Dialog open={!!deletingFee} onOpenChange={(o: boolean) => { if (!o) deletingFee = null; }}>
  <DialogContent class="max-w-sm">
    <div class="px-6 py-5 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-destructive"><Trash2 class="h-6 w-6" /></div>
      <h3 class="text-base font-semibold">Delete Fee</h3>
      <p class="mt-2 text-sm text-muted-foreground">Delete <strong>{deletingFee?.name}</strong>? This cannot be undone.</p>
    </div>
    <DialogFooter>
      <DialogClose>
        <button type="button" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={deletingFee?.id ?? ''} />
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>
