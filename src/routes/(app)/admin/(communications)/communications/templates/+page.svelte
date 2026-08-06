<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '$lib/components/ui/dialog/index.js';
  import { Plus, Trash2 } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import type { ActionResult } from '@sveltejs/kit';
  import { dispatchToast } from '$lib/notifications';

  interface Template {
    id: string;
    name: string;
    channel: string;
    subject: string | null;
    body: string;
    variables: string[];
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
  }

  const { data }: { data: PageData } = $props();
  const templates = $derived(data.templates);

  let formData = $state<Record<string, unknown>>({ channel: 'sms', variables: '' });
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);
  let showForm = $state(false);
  let editingTemplate = $state<Template | null>(null);
  let deletingTemplate = $state<Template | null>(null);

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
          dispatchToast('Saved', result.data?.message ?? 'Changes saved successfully.');
          formData = { channel: 'sms', variables: '' };
          editingTemplate = null;
          showForm = false;
        }
        update();
      } finally {
        submitting = false;
      }
    };
  }

  function openCreate() {
    formData = { channel: 'sms', variables: '' };
    editingTemplate = null;
    errors = {};
    showForm = true;
  }

  function openEdit(t: Template) {
    editingTemplate = t;
    formData = {
      id: t.id,
      name: t.name,
      channel: t.channel ?? 'sms',
      subject: t.subject ?? '',
      body: t.body,
      variables: (t.variables ?? []).join(', '),
    };
    errors = {};
    showForm = true;
  }

  function openDelete(t: Template) {
    deletingTemplate = t;
  }
</script>

<DashboardContent title="Message Templates" subtitle="Reusable SMS and email message templates">
  {#snippet headerActions()}
    <Button onclick={openCreate} size="sm">
      <Plus class="h-3.5 w-3.5" /> New Template
    </Button>
  {/snippet}

  {#if msg && !showForm}
    <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-destructive'}">{msg.text}</div>
  {/if}

  <DataTable
    data={templates}
    columns={[
      { key: 'name', label: 'Name', sortable: true },
      { key: 'channel', label: 'Channel', render: (t: any) => t.channel ?? '—' },
      { key: 'subject', label: 'Subject', render: (t: any) => t.subject ?? '—' },
      { key: 'body', label: 'Body', render: (t: any) => t.body?.slice(0, 60) ?? '—' },
      { key: 'variables', label: 'Variables', render: (t: any) => t.variables?.join(', ') ?? '—' },
    ]}
    emptyMessage="No templates yet"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog open={showForm} onOpenChange={(o: boolean) => { if (!o) { showForm = false; editingTemplate = null; } }}>
  <DialogContent class="sm:max-w-lg p-0">
    <DialogHeader class="border-b border-slate-200 px-6 py-4">
      <DialogTitle class="text-base font-semibold">{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
    </DialogHeader>

    <form method="POST" action={editingTemplate ? '?/update' : '?/create'} use:enhance={handleSubmit} class="px-6 py-5 space-y-4">
      {#if editingTemplate}
        <input type="hidden" name="id" value={editingTemplate.id} />
      {/if}

      <div class="space-y-1.5">
        <Label for="name">Name</Label>
        <Input id="name" name="name" type="text" bind:value={formData.name} placeholder="e.g. Fee reminder, Attendance alert" />
        {#if errors.name?.[0]}<p class="text-xs text-destructive">{errors.name?.[0]}</p>{/if}
      </div>

      <div class="space-y-1.5">
        <Label for="channel">Channel</Label>
        <select id="channel" name="channel" bind:value={formData.channel} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="both">SMS + Email</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <Label for="subject">Subject (email only)</Label>
        <Input id="subject" name="subject" type="text" bind:value={formData.subject} placeholder="Optional for SMS" />
      </div>

      <div class="space-y-1.5">
        <Label for="body">Message body</Label>
        <textarea id="body" name="body" bind:value={formData.body} rows="4" class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Dear &#123;&#123;parent_name&#125;&#125;, ..."></textarea>
        {#if errors.body?.[0]}<p class="text-xs text-destructive">{errors.body?.[0]}</p>{/if}
      </div>

      <div class="space-y-1.5">
        <Label for="variables">Variables (comma separated)</Label>
        <Input id="variables" name="variables" type="text" bind:value={formData.variables} placeholder="parent_name, student_name, amount" />
      </div>

      <DialogFooter>
        <DialogClose>
          <button type="button" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>{editingTemplate ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Delete Confirmation -->
<Dialog open={!!deletingTemplate} onOpenChange={(o: boolean) => { if (!o) deletingTemplate = null; }}>
  <DialogContent class="max-w-sm">
    <div class="px-6 py-5 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-destructive">
        <Trash2 class="h-6 w-6" />
      </div>
      <h3 class="text-base font-semibold">Delete Template</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Are you sure you want to delete <strong>{deletingTemplate?.name}</strong>? This cannot be undone.
      </p>
    </div>
    <DialogFooter>
      <DialogClose>
        <button type="button" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={deletingTemplate?.id ?? ''} />
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>
