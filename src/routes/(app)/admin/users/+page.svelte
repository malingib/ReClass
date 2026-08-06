<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '$lib/components/ui/dialog/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { Trash2 } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import type { ActionResult } from '@sveltejs/kit';
  import { dispatchToast } from '$lib/notifications';

  interface User {
    id: string;
    user_id: string;
    role: string;
    profiles?: { id: string; full_name: string } | null;
  }

  interface ActionData extends Record<string, unknown> {
    message?: string;
    errors?: Record<string, string[]>;
  }

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

  let formData = $state<Record<string, unknown>>({});
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);

  let showCreate = $state(false);
  let editingUser = $state<User | null>(null);
  let deletingUser = $state<User | null>(null);

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
          editingUser = null;
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
    editingUser = null;
    showCreate = true;
  }

  function openEdit(user: User) {
    editingUser = user;
    formData = {
      id: user.id,
      user_id: user.user_id,
      role: user.role,
    };
    showCreate = true;
  }

  function openDelete(user: User) {
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
    <Button onclick={openCreate} class="gap-1.5">
      <span class="text-xs">+</span> Assign Role
    </Button>
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

<Dialog bind:open={showCreate}>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>{editingUser ? 'Edit User Role' : 'Assign Role'}</DialogTitle>
      <DialogDescription>Assign a role to a user to grant them access to the system.</DialogDescription>
    </DialogHeader>

    <form
      method="POST"
      action={editingUser ? '?/update' : '?/create'}
      class="space-y-4"
      use:enhance={handleSubmit}
    >
      {#if editingUser}
        <input type="hidden" name="id" value={editingUser.id} />
      {/if}

      <div class="space-y-2">
        <Label for="user_id">User (Profile)</Label>
        {#if editingUser}
          <Input
            id="user_id"
            name="user_id"
            value={formData.user_id}
            readonly
            class="bg-muted"
          />
        {:else}
          <select
            id="user_id"
            name="user_id"
            value={formData.user_id}
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select a user…</option>
            {#each availableProfiles as profile}
              <option value={profile.id}>{profile.full_name}</option>
            {/each}
          </select>
        {/if}
        {#if errors.user_id?.[0]}
          <p class="text-xs text-destructive">{errors.user_id?.[0]}</p>
        {/if}
      </div>

      <div class="space-y-2">
        <Label for="role">Role</Label>
        <select
          id="role"
          name="role"
          value={formData.role}
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select role…</option>
          <option value="school_admin">Admin</option>
          <option value="principal">Principal</option>
          <option value="teacher">Teacher</option>
          <option value="bursar">Bursar</option>
          <option value="parent">Parent</option>
        </select>
        {#if errors.role?.[0]}
          <p class="text-xs text-destructive">{errors.role?.[0]}</p>
        {/if}
      </div>

      {#if msg}
        <Alert variant={msg.type === 'success' ? 'default' : 'destructive'}>
          <AlertTitle>{msg.text}</AlertTitle>
        </Alert>
      {/if}

      <DialogFooter>
        <DialogClose>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>
          {#if submitting}
            <svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving...
          {:else}
            {editingUser ? 'Update' : 'Assign'}
          {/if}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<Dialog open={!!deletingUser} onOpenChange={(o: boolean) => { if (!o) closeDelete(); }}>
  <DialogContent class="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Remove User Role</DialogTitle>
      <DialogDescription>Are you sure you want to remove the role <strong>{deletingUser ? (roleLabels[deletingUser.role] ?? deletingUser.role) : ''}</strong> from this user?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose>
        <Button type="button" variant="outline">Cancel</Button>
      </DialogClose>
      <form method="POST" action="?/delete" use:enhance class="inline">
        <input type="hidden" name="id" value={deletingUser?.id ?? ''} />
        <Button type="submit" variant="destructive">Remove</Button>
      </form>
    </DialogFooter>
  </DialogContent>
</Dialog>
