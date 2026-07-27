<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import { goto } from '$app/navigation';
  async function signOut() {
    await getSupabase().auth.signOut();
    goto('/login');
  }
</script>

<svelte:head><title>Account not provisioned — ReClass</title></svelte:head>

<div class="flex min-h-screen items-center justify-center bg-ink-50 px-4">
  <div class="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-card">
    <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-2xl">⚠️</div>
    <h1 class="text-lg font-semibold text-ink-900">Account not provisioned</h1>
    <p class="mt-2 text-sm text-ink-500">
      Your account has a role but is not linked to a school tenant. A ReClass administrator
      needs to assign your account to a school before you can continue.
    </p>
    <button
      onclick={signOut}
      class="mt-6 rounded-xl border border-ink-200 bg-white px-5 py-2 text-sm font-medium text-ink-700 shadow-sm transition-all hover:border-ink-300"
    >
      Back to sign in
    </button>
  </div>
</div>
