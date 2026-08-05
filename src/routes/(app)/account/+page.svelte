<script lang="ts">
  import { page } from '$app/stores';

  const userInfo = $derived({
    name: $page.data?.user?.user_metadata?.full_name ?? $page.data?.user?.email ?? 'User',
    email: $page.data?.user?.email ?? '',
    role: $page.data?.role ?? '',
    tenant: $page.data?.role ?? '',
  });
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
      <p class="mt-1 text-sm text-ink-500">Password and security settings are managed through your Supabase Auth account.</p>
      <div class="mt-4">
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Manage in Supabase
        </a>
      </div>
    </div>
  </div>
