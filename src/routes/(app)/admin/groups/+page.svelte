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

  let groups = $derived(data.groups);
  let subjects = $derived(data.subjects);
  let teachers = $derived(data.teachers);

  const { form, errors, enhance: superEnhance, message, reset } = superForm(data.form, {
    validators: zodClient(),
  });

  const groupForm = form;

  let showCreate = $state(false);
  let editingGroup = $state<any | null>(null);
  let deletingGroup = $state<any | null>(null);

  function openCreate() {
    reset();
    editingGroup = null;
    showCreate = true;
  }

  function openEdit(g: any) {
    editingGroup = g;
    reset({
      id: g.id,
      name: g.name,
      subject_id: g.subject_id ?? '',
      teacher_id: g.teacher_id ?? '',
      grade: g.grade ?? '',
      room: g.room ?? '',
      capacity: g.capacity ?? 0,
      status: g.status,
    });
    showCreate = true;
  }

  function openDelete(g: any) {
    deletingGroup = g;
  }

  function teacherName(id: string): string {
    const t = teachers.find((t: any) => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : '—';
  }
</script>

<DashboardContent title="Remedial Groups" subtitle="All remedial student groups">
  {#snippet headerActions()}
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Add Group
    </button>
  {/snippet}

  <DataTable
    data={groups}
    columns={[
      { key: 'name', label: 'Name', sortable: true },
      { key: 'subject', label: 'Subject', sortable: true },
      { key: 'grade', label: 'Grade', sortable: true },
      { key: 'room', label: 'Room' },
      { key: 'student_count', label: 'Students' },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    emptyMessage="No groups found"
    onEdit={openEdit}
    onDelete={openDelete}
  />
</DashboardContent>

<!-- Create/Edit Modal -->
<Dialog.Root open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingGroup = null; }}}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <Dialog.Title class="text-base font-semibold text-ink-900">{editingGroup ? 'Edit Group' : 'Add Group'}</Dialog.Title>
        <Dialog.Close class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </Dialog.Close>
      </div>

      <form method="POST" action={editingGroup ? '?/update' : '?/create'} use:superEnhance class="px-6 py-5 space-y-4">
        {#if editingGroup}
          <input type="hidden" name="id" value={editingGroup.id} />
        {/if}

        <div class="space-y-1.5">
          <label for="name" class="text-xs font-medium text-ink-700">Name</label>
          <input id="name" name="name" type="text" bind:value={groupForm.name} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Form 1 Math Remedial" />
          {#if errors.name}<p class="text-xs text-danger">{errors.name}</p>{/if}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="subject_id" class="text-xs font-medium text-ink-700">Subject</label>
            <select id="subject_id" name="subject_id" bind:value={groupForm.subject_id} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
              <option value="">No subject</option>
              {#each subjects as s}
                <option value={s.id}>{s.name} ({s.code})</option>
              {/each}
            </select>
            {#if errors.subject_id}<p class="text-xs text-danger">{errors.subject_id}</p>{/if}
          </div>
          <div class="space-y-1.5">
            <label for="teacher_id" class="text-xs font-medium text-ink-700">Teacher</label>
            <select id="teacher_id" name="teacher_id" bind:value={groupForm.teacher_id} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
              <option value="">No teacher</option>
              {#each teachers as t}
                <option value={t.id}>{t.first_name} {t.last_name}</option>
              {/each}
            </select>
            {#if errors.teacher_id}<p class="text-xs text-danger">{errors.teacher_id}</p>{/if}
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="space-y-1.5">
            <label for="grade" class="text-xs font-medium text-ink-700">Grade</label>
            <input id="grade" name="grade" type="text" bind:value={groupForm.grade} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Form 1" />
            {#if errors.grade}<p class="text-xs text-danger">{errors.grade}</p>{/if}
          </div>
          <div class="space-y-1.5">
            <label for="room" class="text-xs font-medium text-ink-700">Room</label>
            <input id="room" name="room" type="text" bind:value={groupForm.room} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="Rm 101" />
            {#if errors.room}<p class="text-xs text-danger">{errors.room}</p>{/if}
          </div>
          <div class="space-y-1.5">
            <label for="capacity" class="text-xs font-medium text-ink-700">Capacity</label>
            <input id="capacity" name="capacity" type="number" bind:value={groupForm.capacity} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" placeholder="40" />
            {#if errors.capacity}<p class="text-xs text-danger">{errors.capacity}</p>{/if}
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="status" class="text-xs font-medium text-ink-700">Status</label>
          <select id="status" name="status" bind:value={groupForm.status} class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20">
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
          <Button type="submit" variant="primary" size="md">{editingGroup ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Delete Confirmation Modal -->
<Dialog.Root open={!!deletingGroup} onOpenChange={(o: boolean) => { if (!o) deletingGroup = null; }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated">
      <div class="px-6 py-5 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 class="h-6 w-6" />
        </div>
        <h3 class="text-base font-semibold text-ink-900">Delete Group</h3>
        <p class="mt-2 text-sm text-ink-500">
          Are you sure you want to delete <strong>{deletingGroup?.name}</strong>? This action cannot be undone.
        </p>
      </div>
      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Dialog.Close>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        </Dialog.Close>
        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={deletingGroup?.id ?? ''} />
          <Button type="submit" variant="danger" size="md">Delete</Button>
        </form>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
