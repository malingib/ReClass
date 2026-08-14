<script lang="ts">
  import { page } from '$app/stores';
  import { getSupabase } from '$lib/supabase/client';

  const userInfo = $derived({
    name: $page.data?.user?.user_metadata?.full_name ?? $page.data?.user?.email ?? 'User',
    email: $page.data?.user?.email ?? '',
    role: $page.data?.role ?? '',
  });

  let pwNew = $state('');
  let pwStatus = $state<'idle' | 'saving' | 'done' | 'error'>('idle');
  let pwMessage = $state('');

  async function changePassword(e: SubmitEvent) {
    e.preventDefault();
    if (pwNew.length < 8) {
      pwStatus = 'error';
      pwMessage = 'New password must be at least 8 characters.';
      return;
    }
    pwStatus = 'saving';
    pwMessage = '';
    const { error } = await getSupabase().auth.updateUser({ password: pwNew });
    if (error) {
      pwStatus = 'error';
      pwMessage = error.message;
      return;
    }
    pwStatus = 'done';
    pwMessage = 'Password updated.';
    pwNew = '';
  }
</script>

<div class="space-y-6">
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h3 class="text-sm font-semibold text-ink-900">Profile Information</h3>
      <div class="mt-4 space-y-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-ink-400">Name</p>
          <p class="mt-1 text-sm text-ink-800">{userInfo.name}</p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-ink-400">Email</p>
          <p class="mt-1 text-sm text-ink-800">{userInfo.email}</p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-ink-400">Role</p>
          <p class="mt-1 text-sm text-ink-800">{userInfo.role ? userInfo.role.replace('_', ' ') : '—'}</p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-ink-400">Account created</p>
          <p class="mt-1 text-sm text-ink-800">{new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-border bg-white p-6 shadow-card">
      <h3 class="text-sm font-semibold text-ink-900">Security</h3>
      <p class="mt-1 text-sm text-ink-500">Change your password. Use at least 8 characters.</p>
      <form class="mt-4 space-y-3" onsubmit={changePassword}>
        <div>
          <label for="pw-new" class="text-xs font-medium uppercase tracking-wider text-ink-400">New password</label>
          <input
            id="pw-new"
            type="password"
            autocomplete="new-password"
            bind:value={pwNew}
            class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary"
          />
        </div>
        <div class="flex items-center gap-3">
          <button
            type="submit"
            disabled={pwStatus === 'saving'}
            class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {pwStatus === 'saving' ? 'Updating…' : 'Update password'}
          </button>
          {#if pwStatus === 'done'}
            <span class="text-sm text-emerald-600">{pwMessage}</span>
          {:else if pwStatus === 'error'}
            <span class="text-sm text-red-600">{pwMessage}</span>
          {/if}
        </div>
      </form>
    </div>
  </div>
