<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import { goto } from '$app/navigation';
  import { roleRoutes, isRole } from '$lib/auth';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;

    const { data, error: authErr } = await getSupabase().auth.signInWithPassword({ email, password });
    if (authErr) {
      error = 'Invalid email or password';
      loading = false;
      return;
    }

    const { data: roleData } = await getSupabase()
      .from('user_roles')
      .select('role, tenant_id, profiles(full_name)')
      .eq('user_id', data.user.id)
      .single();

    const targetRole = roleData?.role;
    goto(targetRole && isRole(targetRole) ? roleRoutes[targetRole] : '/');
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(0,197,115,0.18),_transparent_24%),linear-gradient(135deg,_#f4f7fb_0%,_#f8fbff_100%)] p-4">
  <div class="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-border/80 bg-surface/90 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
    <div class="bg-gradient-to-br from-brand-600 via-brand-500 to-sky-500 p-8 text-white sm:p-10">
      <div class="flex h-full flex-col justify-between">
        <div>
          <div class="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/90">ReClass portal</div>
          <h1 class="mt-6 text-3xl font-semibold tracking-tight">A simpler way to work in ReClass.</h1>
          <p class="mt-3 max-w-md text-sm text-white/80">Use your school account to reach the dashboard for students, attendance, fees, and staff.</p>
        </div>
        <div class="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
          <p class="text-sm font-medium">Today&rsquo;s focus</p>
          <p class="mt-1 text-xs text-white/80">Review attendance trends, fee reminders, and the next priority tasks.</p>
        </div>
      </div>
    </div>

    <div class="p-8 sm:p-10">
      <div class="border-0 bg-transparent shadow-none">
        <div class="p-0">
          <form onsubmit={handleSubmit} class="space-y-5">
            <div class="text-center space-y-2">
              <div class="flex justify-center">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-[0_10px_30px_rgba(0,197,115,0.28)]">R</div>
              </div>
              <h2 class="text-2xl font-semibold text-ink-900">Sign in</h2>
              <p class="text-sm text-ink-400">Use your work email and password to continue</p>
            </div>

            {#if error}
              <div class="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{error}</div>
            {/if}

            <div class="space-y-2">
              <label for="email" class="text-sm font-medium text-ink-700">Email</label>
              <input
                id="email"
                type="email"
                required
                bind:value={email}
                class="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder="admin@school.ac.ke"
              />
            </div>

            <div class="space-y-2">
              <label for="password" class="text-sm font-medium text-ink-700">Password</label>
              <input
                id="password"
                type="password"
                required
                bind:value={password}
                class="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-8 py-3 text-base font-medium text-white shadow-[0_10px_24px_rgba(0,197,115,0.25)] transition-all hover:from-brand-600 hover:to-brand-700 active:from-brand-700 active:to-brand-800 disabled:opacity-50"
            >
              {#if loading}
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              {/if}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>
