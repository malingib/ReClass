<script lang="ts">
  // @ts-nocheck
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Dialog } from 'bits-ui';
  import { Plus, Pencil, Trash2 } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  const { data }: { data: PageData } = $props();

  const users = $derived(data.users);
  const availableProfiles = $derived(data.availableProfiles ?? []);

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    school_admin: 'Admin',
    principal: 'Principal',
    teacher: 'Teacher',
    bursar: 'Bursar',
    parent: 'Parent',
  };

  const { form, errors, message, reset } = superForm(data.form, {
    validators: zodClient(),
  });

  const userForm = form;

  let showCreate = $state(false);
  let editingUser = $state<any | null>(null);
  let deletingUser = $state<any | null>(null);

  function openCreate() {
    reset();
    editingUser = null;
    showCreate = true;
  }

  function openEdit(user: any) {
    editingUser = user;
    reset({
      id: user.id,
      user_id: user.user_id,
      role: user.role,
    });
    showCreate = true;
  }

  function openDelete(user: any) {
    deletingUser = user;
  }

  function closeCreate() {
    showCreate = false;
    editingUser = null;
  }

  function closeDelete() {
    deletingUser = null;
  }
</script>

<DashboardContent title="Users" subtitle="System users and role assignments">
  {#snippet headerActions()}
    <button onclick={openCreate} class="rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 flex items-center gap-1.5">
      <Plus class="h-3.5 w-3.5" /> Assign Role
    </button>
  {/snippet}

  <DataTable
    data={users}
    columns={[
      { key: 'profiles', label: 'Name', render: (u: any) => u.profiles?.[0]?.full_name ?? u.profiles?.full_name ?? '—', sortable: true },
      { key: 'user_id', label: 'Profile ID' },
      { key: 'role', label: 'Role', render: (u: any) => roleLabels[u.role] ?? u.role, sortable: true },
    ]}
    emptyMessage="No users found"
    onEdit={openEdit}
    onDelete={openDelete}
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
          {editingUser ? 'Edit User Role' : 'Assign Role'}
        </Dialog.Title>
        <Dialog.Close class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Dialog.Close>
      </div>

      <form
        method="POST"
        action={editingUser ? '?/update' : '?/create'}
        class="px-6 py-5 space-y-4"
      >
        {#if editingUser}
          <input type="hidden" name="id" value={editingUser.id} />
        {/if}

        <div class="space-y-1.5">
          <label for="user_id" class="text-xs font-medium text-ink-700">User (Profile)</label>
          {#if editingUser}
            <input
              id="user_id"
              name="user_id"
              type="text"
              value={userForm.user_id}
              readonly
              class="w-full rounded-lg border border-border bg-ink-50 px-3 py-2 text-sm text-ink-500 cursor-not-allowed"
            />
          {:else}
            <select
              id="user_id"
              name="user_id"
              value={userForm.user_id}
              class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Select a user…</option>
              {#each availableProfiles as profile}
                <option value={profile.id}>{profile.full_name} ({profile.email ?? 'no email'})</option>
              {/each}
            </select>
          {/if}
          {#if errors.user_id}
            <p class="text-xs text-danger">{errors.user_id}</p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <label for="role" class="text-xs font-medium text-ink-700">Role</label>
          <select
            id="role"
            name="role"
            value={userForm.role}
            class="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Select role…</option>
            <option value="school_admin">Admin</option>
            <option value="principal">Principal</option>
            <option value="teacher">Teacher</option>
            <option value="bursar">Bursar</option>
            <option value="parent">Parent</option>
          </select>
          {#if errors.role}
            <p class="text-xs text-danger">{errors.role}</p>
          {/if}
        </div>

        {#if message}
          <div class="rounded-lg px-4 py-2 text-sm {message.success ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-danger'}">
            {message.text}
          </div>
        {/if}

        <div class="flex justify-end gap-3 pt-2">
          <Dialog.Close>
            <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
          </Dialog.Close>
          <Button type="submit" variant="primary" size="md">
            {editingUser ? 'Update' : 'Assign'}
          </Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- Delete Confirmation Modal -->
<Dialog.Root open={!!deletingUser} onOpenChange={(o: boolean) => { if (!o) closeDelete(); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-elevated"
    >
      <div class="px-6 py-5 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
          <Trash2 class="h-6 w-6" />
        </div>
        <h3 class="text-base font-semibold text-ink-900">Remove User Role</h3>
        <p class="mt-2 text-sm text-ink-500">
          Are you sure you want to remove the role <strong>{roleLabels[deletingUser?.role] ?? deletingUser?.role}</strong> from this user?
        </p>
      </div>

      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Dialog.Close>
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
        </Dialog.Close>
        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={deletingUser?.id ?? ''} />
          <Button type="submit" variant="danger" size="md">Remove</Button>
        </form>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
