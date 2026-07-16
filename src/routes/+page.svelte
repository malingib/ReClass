<script lang="ts">
  import { goto } from '$app/navigation';

  const roles = [
    { id: 'school_admin', label: 'Admin', icon: '🏫', desc: 'Manage students, teachers, scheduling, and fees', color: 'from-brand-500 to-brand-600' },
    { id: 'teacher', label: 'Teacher', icon: '📚', desc: 'Mark attendance, view timetable, manage groups', color: 'from-violet-500 to-violet-600' },
    { id: 'parent', label: 'Parent', icon: '👨‍👩‍👧', desc: 'Track your child\'s attendance, fees, and payments', color: 'from-amber-500 to-amber-600' },
    { id: 'bursar', label: 'Bursar', icon: '💰', desc: 'Manage invoices, waivers, and revenue reports', color: 'from-emerald-500 to-emerald-600' },
    { id: 'principal', label: 'Principal', icon: '📊', desc: 'Monitor effectiveness, attendance, and reports', color: 'from-sky-500 to-sky-600' },
  ];

  function goLogin() { goto('/login'); }
</script>

<svelte:head>
  <title>ReClass — Remedial Classes Management</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(0,197,115,0.18),_transparent_24%),linear-gradient(135deg,_#f4f7fb_0%,_#f8fbff_100%)]">
  <header class="flex items-center justify-between px-6 py-4 sm:px-10">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,197,115,0.28)]">R</div>
      <span class="text-lg font-semibold text-ink-900">ReClass</span>
    </div>
    <button onclick={goLogin} class="rounded-xl border border-ink-200 bg-white px-5 py-2 text-sm font-medium text-ink-700 shadow-sm transition-all hover:border-ink-300 hover:shadow-md">
      Sign in
    </button>
  </header>

  <main class="flex flex-1 flex-col items-center justify-center px-4 py-16">
    <div class="text-center">
      <span class="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-700">Multi-portal platform</span>
      <h1 class="mt-5 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">Choose your portal</h1>
      <p class="mx-auto mt-3 max-w-lg text-sm text-ink-400">Select your role to access the relevant dashboard for students, attendance, fees, and staff management.</p>
    </div>

    <div class="mt-12 grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each roles as r (r.id)}
        <a
          href="/login"
          class="group relative overflow-hidden rounded-2xl border border-ink-200/60 bg-white/80 p-6 shadow-[0_4px_20px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-ink-300 hover:shadow-[0_12px_40px_rgba(15,23,42,0.1)]"
        >
          <div class="flex items-start justify-between">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br {r.color} text-xl text-white shadow-md">
              {r.icon}
            </div>
            <svg class="h-5 w-5 text-ink-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-ink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 class="mt-4 text-base font-semibold text-ink-900">{r.label}</h3>
          <p class="mt-1 text-xs text-ink-400">{r.desc}</p>
        </a>
      {/each}
    </div>

    <p class="mt-10 text-xs text-ink-300">
      Already have an account?
      <a href="/login" class="font-medium text-brand-600 hover:text-brand-700">Sign in</a>
    </p>
  </main>

  <footer class="border-t border-ink-100 px-6 py-4 text-center text-xs text-ink-300 sm:px-10">
    &copy; {new Date().getFullYear()} ReClass &mdash; Mobiwave Innovations Ltd
  </footer>
</div>
