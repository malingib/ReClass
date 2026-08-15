<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { ActionResult } from '@sveltejs/kit';
  const { form } = $props();

  let error = $state('');
  let loading = $state(false);
  let showPw = $state(false);
  let tab = $state<'staff' | 'parent'>('staff');
</script>

<svelte:head>
  <title>Sign in — eShule</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-50 p-4">
  <a
    href="/"
    class="anim-card stagger-1 group fixed left-6 top-6 z-10 flex items-center gap-1.5 text-sm text-slate-400 no-underline transition-colors hover:text-slate-600"
  >
    <svg class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
    Back to eShule
  </a>

  <div class="relative w-full max-w-sm">
    <div class="rounded-lg border border-slate-200 bg-white p-8 shadow-lg">
      <div class="anim-card stagger-2 mb-7 flex flex-col items-center">
        <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-base font-bold text-white">
          e
        </div>
        <h1 class="mt-4 text-xl font-semibold text-slate-900">Sign in</h1>
        <p class="mt-1 text-sm text-slate-500">Use your school account to continue</p>
      </div>

      <div class="anim-card stagger-3 mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onclick={() => tab = 'staff'}
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {tab === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
        >
          Staff
        </button>
        <button
          type="button"
          onclick={() => tab = 'parent'}
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {tab === 'parent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
        >
          Parent
        </button>
      </div>

      {#if tab === 'parent'}
        <p class="anim-card stagger-3 mb-1 text-xs text-slate-500">
          Parents sign in with the National ID and phone number you received by SMS. One login shows all of your enrolled children.
        </p>
      {/if}

      {#if form?.error}
        <div class="anim-card stagger-3 mb-5 flex items-center gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{form.error}</span>
        </div>
      {:else if error}
        <div class="anim-card stagger-3 mb-5 flex items-center gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
        </div>
      {/if}

      <form method="POST" action={tab === 'parent' ? '?/parentSignIn' : '?/signIn'} use:enhance={() => {
        loading = true;
        error = '';
        return async ({ result }: { result: ActionResult }) => {
          loading = false;
          if (result.type === 'failure') {
            error = result.data?.error ?? 'Something went wrong. Please try again.';
          } else if (result.type === 'redirect') {
            goto(result.location);
          }
        };
      }} class="space-y-4">
        {#if tab === 'staff'}
          <div class="anim-card stagger-4">
            <label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <div class="relative">
              <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="you@school.ac.ke"
              />
            </div>
          </div>

          <div class="anim-card stagger-5">
            <label for="password" class="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <div class="relative">
              <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                autocomplete="current-password"
                required
                class="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onclick={() => showPw = !showPw}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                tabindex="-1"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {#if showPw}
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                {:else}
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {/if}
              </button>
            </div>
          </div>
        {:else}
          <div class="anim-card stagger-4">
            <label for="national_id" class="mb-1.5 block text-sm font-medium text-slate-700">National ID</label>
            <div class="relative">
              <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5h4.5v4.5h-4.5v-4.5z"/></svg>
              <input
                id="national_id"
                name="national_id"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                required
                class="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. 12345678"
              />
            </div>
          </div>

          <div class="anim-card stagger-5">
            <label for="phone" class="mb-1.5 block text-sm font-medium text-slate-700">Phone number (used as password)</label>
            <div class="relative">
              <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputmode="tel"
                autocomplete="off"
                required
                class="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. 0712345678"
              />
            </div>
          </div>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="anim-card stagger-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {#if loading}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          {/if}
          {loading ? 'Signing in…' : tab === 'parent' ? 'Sign in as Parent' : 'Sign in'}
        </button>
      </form>
    </div>
    <p class="anim-card stagger-7 mt-6 text-center text-xs text-slate-400">eShule &mdash; School Management Platform</p>
  </div>
</div>
