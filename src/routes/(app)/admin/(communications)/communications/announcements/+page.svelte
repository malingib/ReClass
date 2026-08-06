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

  interface Announcement {
    id: string;
    title: string;
    body: string;
    audience: string;
    priority: string;
    status: string;
    published_at: string | null;
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
  }

  const { data }: { data: PageData } = $props();
  const announcements = $derived(data.announcements);

  let formData = $state<Record<string, unknown>>({ audience: 'all', priority: 'normal' });
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);
  let showForm = $state(false);
  let editingAnnouncement = $state<Announcement | null>(null);
  let deletingAnnouncement = $state<Announcement | null>(null);

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
          formData = { audience: 'all', priority: 'normal' };
          editingAnnouncement = null;
          showForm = false;
        }
        update();
      } finally {
        submitting = false;
      }
    };
  }

  function openCreate() {
    formData = { audience: 'all', priority: 'normal' };
    editingAnnouncement = null;
    errors = {};
    showForm = true;
  }

  function openEdit(a: Announcement) {
    editingAnnouncement = a;
    formData = {
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience ?? 'all',
      priority: a.priority ?? 'normal',
    };
    errors = {};
    showForm = true;
  }

  function openDelete(a: Announcement) {
    deletingAnnouncement = a;
  }
</script>

<DashboardContent title="Announcements" subtitle="Create and manage school communications">
  {#snippet headerActions()}
    <Button onclick={openCreate} size="sm">
      <Plus class="h-3.5 w-3.5" /> New Announcement
    </Button>
  {/snippet}

  {#if msg && !showForm}
    <div class="rounded-lg px-4 py-2 text-sm {msg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-destructive'}">{msg.text}</div>
  {/if}

  <DataTable
    data={announcements}
    columns={[
      { key: 'title', label: 'Title', sortable: true },
      { key: 'audience', label: 'Audience', render: (a: any) => (a.audience ?? 'all').charAt(0).toUpperCase() + (a.audience ?? 'all').slice(1) },
      { key: 'priority', label: 'Priority', render: (a: any) => (a.priority ?? 'normal').charAt(0).toUpperCase() + (a.priority ?? 'normal').slice(1) },
      { key: 'status', label: 'Status', render: (a: any) => (a.status ?? 'draft').charAt(0).toUpperCase() + (a.status ?? 'draft').slice(1) },
      { key: 'published_at', label: 'Published', render: (a: any) => a.published_at ? new Date(a.published_at).toLocaleDateString('en-GB') : '—' },
    ]}
    emptyMessage="No announcements yet"
    onEdit={openEdit}
    onDelete={openDelete}
    rowExtra={rowActions}
  />

  {#snippet rowActions(a: any)}
    <div class="inline-flex items-center gap-2">
      {#if a.status === 'draft' || a.status === 'archived'}
        <form method="POST" action="?/publish" use:enhance>
          <input type="hidden" name="id" value={a.id} />
          <Button type="submit" size="sm" variant="default">Publish</Button>
        </form>
      {:else if a.status === 'published'}
        <form method="POST" action="?/unpublish" use:enhance>
          <input type="hidden" name="id" value={a.id} />
          <Button type="submit" size="sm" variant="outline">Unpublish</Button>
        </form>
        <form method="POST" action="?/archive" use:enhance>
          <input type="hidden" name="id" value={a.id} />
          <Button type="submit" size="sm" variant="ghost">Archive</Button>
        </form>
      {/if}
    </div>
  {/snippet}
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog open={showForm} onOpenChange={(o: boolean) => { if (!o) { showForm = false; editingAnnouncement = null; } }}>
  <DialogContent class="sm:max-w-lg p-0">
    <DialogHeader class="border-b border-slate-200 px-6 py-4">
      <DialogTitle class="text-base font-semibold">{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
    </DialogHeader>

    <form method="POST" action={editingAnnouncement ? '?/update' : '?/create'} use:enhance={handleSubmit} class="px-6 py-5 space-y-4">
      {#if editingAnnouncement}
        <input type="hidden" name="id" value={editingAnnouncement.id} />
      {/if}

      <div class="space-y-1.5">
        <Label for="title">Title</Label>
        <Input id="title" name="title" type="text" bind:value={formData.title} placeholder="e.g. Mid-term break reminder" />
        {#if errors.title?.[0]}<p class="text-xs text-destructive">{errors.title?.[0]}</p>{/if}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <Label for="audience">Audience</Label>
          <select id="audience" name="audience" bind:value={formData.audience} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="all">Everyone</option>
            <option value="teachers">Teachers</option>
            <option value="parents">Parents</option>
            <option value="students">Students</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <Label for="priority">Priority</Label>
          <select id="priority" name="priority" bind:value={formData.priority} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div class="space-y-1.5">
        <Label for="body">Message</Label>
        <textarea id="body" name="body" bind:value={formData.body} rows="5" class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Announcement details…"></textarea>
        {#if errors.body?.[0]}<p class="text-xs text-destructive">{errors.body?.[0]}</p>{/if}
      </div>

      <DialogFooter>
        <DialogClose>
          <button type="button" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>{editingAnnouncement ? 'Update' : 'Create draft'}</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Delete Confirmation -->
<Dialog open={!!deletingAnnouncement} onOpenChange={(o: boolean) => { if (!o) deletingAnnouncement = null; }}>
  <DialogContent class="max-w-sm">
    <div class="px-6 py-5 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-destructive">
        <Trash2 class="h-6 w-6" />
      </div>
      <h3 class="text-base font-semibold">Delete Announcement</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Are you sure you want to delete <strong>{deletingAnnouncement?.title}</strong>? This cannot be undone.
      </p>
    </div>
    <DialogFooter>
      <DialogClose>
        <button type="button" class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={deletingAnnouncement?.id ?? ''} />
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>
