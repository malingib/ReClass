<script lang="ts">
  import { cn } from './ui/utils';
  import Skeleton from './ui/skeleton.svelte';
  
  const { 
    label, 
    value, 
    sub = '', 
    icon = 'chart',
    variant = 'default',
    loading = false,
    class: className = ''
  }: {
    label: string;
    value: string | number;
    sub?: string;
    icon?: 'users' | 'clock' | 'check' | 'students' | 'chart' | 'money' | 'calendar' | 'bell';
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber';
    loading?: boolean;
    class?: string;
  } = $props();
  
  const iconPaths = {
    users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    check: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    students: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5',
    chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    money: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    bell: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0'
  };
  
  const gradientClasses = {
    default: 'from-slate-400 to-slate-500',
    success: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-red-500 to-red-600',
    info: 'from-blue-500 to-blue-600',
    purple: 'from-violet-500 to-violet-600',
    amber: 'from-amber-500 to-orange-500'
  };
  
  const shadowClasses = {
    default: 'shadow-slate-500/25',
    success: 'shadow-emerald-500/25',
    warning: 'shadow-amber-500/25',
    danger: 'shadow-red-500/25',
    info: 'shadow-blue-500/25',
    purple: 'shadow-violet-500/25',
    amber: 'shadow-amber-500/25'
  };
</script>

{#if loading}
  <div class={cn(
    'rounded-xl border border-slate-200/60 bg-white p-6',
    'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]',
    className
  )}>
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1 space-y-3">
        <Skeleton class="h-4 w-24" />
        <Skeleton class="h-8 w-16" />
        <Skeleton class="h-3 w-32" />
      </div>
      <Skeleton class="h-12 w-12 rounded-xl" />
    </div>
  </div>
{:else}
  <div class={cn(
    'card-glow group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-6',
    'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]',
    'transition-all duration-200 ease-out',
    'hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
    'hover:-translate-y-0.5',
    className
  )}>
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-slate-500">{label}</p>
        <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">{value}</p>
        <p class="mt-2 text-sm text-slate-500">{sub}</p>
      </div>
      <div class={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-110',
        gradientClasses[variant],
        shadowClasses[variant]
      )}>
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d={iconPaths[icon]} />
        </svg>
      </div>
    </div>
  </div>
{/if}
