<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { ActionResult } from '@sveltejs/kit';
  import { onMount } from 'svelte';
  import { animate } from 'animejs';

  const { form } = $props();

  let error = $state('');
  let loading = $state(false);
  let showPw = $state(false);
  let particlesEl: HTMLDivElement | undefined = $state();
  let cardEl: HTMLDivElement | undefined = $state();

  const blobs: HTMLDivElement[] = [];

  onMount(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const blobAnimations = [
      { el: blobs[0], kfs: [{ translateX: 40, translateY: -50 }, { translateX: -20, translateY: 30 }, { translateX: 0, translateY: 0 }], dur: 18000 },
      { el: blobs[1], kfs: [{ translateX: -50, translateY: 40 }, { translateX: 30, translateY: -40 }, { translateX: 0, translateY: 0 }], dur: 22000 },
      { el: blobs[2], kfs: [{ translateX: 60, translateY: -20 }, { translateX: -30, translateY: 40 }, { translateX: 0, translateY: 0 }], dur: 20000 },
      { el: blobs[3], kfs: [{ translateX: -40, translateY: 50 }, { translateX: 20, translateY: -30 }, { translateX: 0, translateY: 0 }], dur: 24000 },
    ];

    for (const b of blobAnimations) {
      if (!b.el) continue;
      animate(b.el, {
        keyframes: b.kfs,
        duration: b.dur,
        ease: 'easeInOutSine',
        loop: true,
      });
    }

    // Floating particles
    if (particlesEl) {
      const dotCount = 24;
      const dots: HTMLDivElement[] = [];
      for (let i = 0; i < dotCount; i++) {
        const d = document.createElement('div');
        const size = 2 + Math.random() * 3;
        d.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(18,183,106,0.25);left:${Math.random() * 100}%;top:${Math.random() * 100}%`;
        d.dataset.anime = 'particle';
        particlesEl.appendChild(d);
        dots.push(d);
      }

      animate(dots, {
        translateY: { from: 0, to: (_t: unknown, i = 0) => -(60 + (i % 5) * 30) },
        translateX: { from: 0, to: (_t: unknown, i = 0) => (i % 3 === 0 ? 20 : i % 3 === 1 ? -20 : 0) },
        opacity: { from: 1, to: 0 },
        duration: (_t: unknown, i = 0) => 6000 + (i * 300),
        delay: (_t: unknown, i = 0) => i * 150,
        ease: 'easeOutCubic',
        loop: true,
      });
    }

    // Card entrance stagger
    if (cardEl) {
      const els = cardEl.querySelectorAll<HTMLElement>('[data-stagger]');
      if (els.length) {
        els.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; });
        animate(els, {
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 500,
          delay: (_t: unknown, i = 0) => 80 + i * 70,
          ease: 'easeOutQuad',
        });
      }
    }
  });
</script>

<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-stone-50 via-white to-stone-100/80 p-4">
  <div class="pointer-events-none fixed inset-0" role="presentation">
    <div class="absolute left-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-[#ecfdf3] blur-[80px]" bind:this={blobs[0]}></div>
    <div class="absolute right-[-10%] bottom-[-15%] h-[400px] w-[400px] rounded-full bg-[#fef3c7] blur-[80px]" bind:this={blobs[1]}></div>
    <div class="absolute left-[60%] top-[10%] h-[300px] w-[300px] rounded-full bg-[#dbeafe] blur-[80px]" bind:this={blobs[2]}></div>
    <div class="absolute bottom-[5%] right-[40%] h-[250px] w-[250px] rounded-full bg-[#fce7f3] blur-[80px]" bind:this={blobs[3]}></div>
    <div bind:this={particlesEl} class="absolute inset-0" role="presentation"></div>
  </div>

  <a
    href="/"
    class="group fixed left-6 top-6 z-10 flex items-center gap-1.5 text-sm text-ink-400 no-underline transition-colors hover:text-ink-600"
    data-stagger
  >
    <svg class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
    Back to eShule
  </a>

  <div class="relative w-full max-w-sm" bind:this={cardEl}>
    <div class="rounded-2xl border border-border/60 bg-surface/95 p-8 shadow-elevated backdrop-blur-sm">
      <div class="mb-7 flex flex-col items-center" data-stagger>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-base font-bold text-white shadow-[0_8px_20px_rgba(18,183,106,0.3)]">
          R
        </div>
        <h1 class="mt-4 text-xl font-semibold text-ink-900">Sign in</h1>
        <p class="mt-1 text-sm text-ink-400">Use your school account to continue</p>
      </div>

      {#if form?.error}
        <div class="mb-5 flex items-center gap-2.5 rounded-lg border border-danger/15 bg-danger/5 p-3 text-sm text-danger" data-stagger>
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{form.error}</span>
        </div>
      {:else if error}
        <div class="mb-5 flex items-center gap-2.5 rounded-lg border border-danger/15 bg-danger/5 p-3 text-sm text-danger" data-stagger>
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
        </div>
      {/if}

      <form method="POST" action="?/signIn" use:enhance={() => {
        loading = true;
        error = '';
        return async ({ result }: { result: ActionResult }) => {
          loading = false;
          if (result.type === 'failure') {
            error = result.data?.error ?? 'Something went wrong. Please try again.';
          } else if (result.type === 'redirect') {
            // The custom enhance handler takes over navigation, so we must
            // follow the redirect ourselves (default behaviour is skipped).
            goto(result.location);
          }
        };
      }} class="space-y-4">
        <div data-stagger>
          <label for="email" class="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
          <div class="relative">
            <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink-900 placeholder:text-ink-300 caret-brand-500 outline-none transition-all focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15"
              placeholder="you@school.ac.ke"
            />
          </div>
        </div>

        <div data-stagger>
          <label for="password" class="mb-1.5 block text-sm font-medium text-ink-700">Password</label>
          <div class="relative">
            <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              autocomplete="current-password"
              required
              class="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-300 caret-brand-500 outline-none transition-all focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onclick={() => showPw = !showPw}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
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

        <button
          type="submit"
          disabled={loading}
          class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-btn transition-all hover:bg-brand-600 active:scale-[0.98] active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          data-stagger
        >
          {#if loading}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          {/if}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
    <p class="mt-6 text-center text-xs text-ink-400" data-stagger>eShule &mdash; School Management Platform</p>
  </div>
</div>
