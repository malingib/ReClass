<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import NotificationToaster from '$lib/components/NotificationToaster.svelte';
  import { theme, type Theme } from '$lib/stores/theme';
  import { locale, type Locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n';
  import { suiteModules, moduleIcons } from '$lib/modules';

  const {
    title,
    subtitle: _subtitle = '',
    headerActions,
    rightRail,
    role = 'school_admin',
    user = { name: 'ReClass Admin', email: 'admin@reclass.app' },
    children,
  }: {
    title: string;
    subtitle?: string;
    headerActions?: import('svelte').Snippet;
    rightRail?: import('svelte').Snippet;
    role?: string;
    user?: { name?: string; email?: string };
    children?: import('svelte').Snippet;
  } = $props();

  interface NavItem { label: string; href: string; icon?: string; }
  interface NavGroup { label: string; items: NavItem[]; defaultOpen?: boolean; }

  const I = (d: string) =>
    `<svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
      <path stroke-linecap="round" stroke-linejoin="round" d="${d}" />
    </svg>`;

  const icons: Record<string, string> = {
    dashboard: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 8.25V6Zm12 0A2.25 2.25 0 0 1 18 3.75h2.25A2.25 2.25 0 0 1 22.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H18A2.25 2.25 0 0 1 15.75 8.25V6Zm-12 7.5A2.25 2.25 0 0 1 6 11.25h2.25A2.25 2.25 0 0 1 10.5 13.5v2.25a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 15.75Zm12 0A2.25 2.25 0 0 1 18 11.25h2.25A2.25 2.25 0 0 1 22.5 13.5v2.25a2.25 2.25 0 0 1-2.25 2.25H18A2.25 2.25 0 0 1 15.75 15.75Z',
    students: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
    parents: 'M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm14.25 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Zm-13.5 0a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
    teachers: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.479m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
    invoices: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
    fees: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
    subjects: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
    groups: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.479m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
    search: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
    bell: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    chevron: 'm19.5 8.25-7.5 7.5-7.5-7.5',
    sun: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
    moon: 'M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z',
    globe: 'M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418',
  };

  const roleNav: Record<string, NavGroup[]> = {
    school_admin: [
      { label: 'Front office', defaultOpen: true, items: [
        { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
        { label: 'Students', href: '/admin/students', icon: 'students' },
        { label: 'Parents', href: '/admin/parents', icon: 'parents' },
        { label: 'Remedial teachers', href: '/admin/teachers', icon: 'teachers' },
      ]},
      { label: 'Remedial program', defaultOpen: true, items: [
        { label: 'Subjects', href: '/admin/subjects', icon: 'subjects' },
        { label: 'Scheduling', href: '/admin/scheduling', icon: 'calendar' },
        { label: 'Teacher attendance', href: '/admin/attendance', icon: 'calendar' },
      ]},
      { label: 'M-Pesa payments', defaultOpen: true, items: [
        { label: 'Fee definitions', href: '/admin/fees', icon: 'fees' },
        { label: 'Teacher Invoices', href: '/admin/teacher-invoices', icon: 'invoices' },
        { label: 'Parent Payments', href: '/admin/parent-payments', icon: 'invoices' },
      ]},
      { label: 'SIS', defaultOpen: true, items: [
        { label: 'Dashboard', href: '/admin/sis', icon: 'dashboard' },
        { label: 'Classes', href: '/admin/sis/classes', icon: 'subjects' },
        { label: 'Admissions', href: '/admin/sis/admissions', icon: 'students' },
      ]},
      { label: 'Communications', defaultOpen: true, items: [
        { label: 'Dashboard', href: '/admin/communications', icon: 'dashboard' },
        { label: 'Announcements', href: '/admin/communications/announcements', icon: 'bell' },
        { label: 'Templates', href: '/admin/communications/templates', icon: 'invoices' },
        { label: 'Message Log', href: '/admin/notifications', icon: 'bell' },
      ]},
      { label: 'Integrations', defaultOpen: false, items: [
        { label: 'Mobiwave & Daraja', href: '/admin/credentials', icon: 'bell' },
        { label: 'School settings', href: '/admin/settings', icon: 'dashboard' },
      ]},
      { label: 'Reporting', defaultOpen: false, items: [
        { label: 'SMS Log', href: '/admin/notifications', icon: 'bell' },
        { label: 'Users', href: '/admin/users', icon: 'students' },
        { label: 'Reports', href: '/admin/reports', icon: 'fees' },
      ]},
    ],
    teacher: [
      { label: 'Teaching', defaultOpen: true, items: [
        { label: 'My dashboard', href: '/teacher', icon: 'dashboard' },
        { label: 'Remedial timetable', href: '/teacher/timetable', icon: 'calendar' },
      ]},
    ],
    parent: [
      { label: 'My child', defaultOpen: true, items: [
        { label: 'Welcome', href: '/parent', icon: 'dashboard' },
        { label: 'Remedial timetable', href: '/parent/timetable', icon: 'calendar' },
        { label: 'Fee structure', href: '/parent/fees', icon: 'fees' },
        { label: 'Pay via M-Pesa', href: '/parent/pay', icon: 'invoices' },
        { label: 'Payment history', href: '/parent/payments', icon: 'invoices' },
        { label: 'Academic Reports', href: '/parent/academic', icon: 'subjects' },
      ]},
    ],
    principal: [
      { label: 'Oversight', defaultOpen: true, items: [
        { label: 'Remedial overview', href: '/principal', icon: 'dashboard' },
        { label: 'Program effectiveness', href: '/principal/effectiveness', icon: 'teachers' },
        { label: 'Reports', href: '/principal/reports', icon: 'fees' },
      ]},
    ],
    bursar: [
      { label: 'M-Pesa', defaultOpen: true, items: [
        { label: 'Workspace', href: '/bursar', icon: 'dashboard' },
        { label: 'Aging', href: '/bursar/aging', icon: 'invoices' },
        { label: 'Waivers', href: '/bursar/waivers', icon: 'bell' },
      ]},
    ],
    super_admin: [
      { label: 'Platform', defaultOpen: true, items: [
        { label: 'Dashboard', href: '/super-admin', icon: 'dashboard' },
        { label: 'Tenants', href: '/super-admin/tenants', icon: 'groups' },
        { label: 'Audit', href: '/super-admin/audit', icon: 'bell' },
      ]},
    ],
  };

  const navGroupModule: Record<string, string> = {
    'Front office': 'reclass',
    'Remedial program': 'reclass',
    'M-Pesa payments': 'reclass',
    'Integrations': 'reclass',
    'SIS': 'sis',
    'Communications': 'communications',
    'Reporting': 'reports',
    'Teaching': 'reclass',
    'My child': 'reclass',
    'Oversight': 'reclass',
    'Platform': 'reclass',
  };

  const accentGradients: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    orange: 'from-orange-500 to-orange-600',
    slate: 'from-slate-500 to-slate-600',
  };

  function isActive(pathname: string, href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
  }

  const activeModule = $derived.by(() => {
    const p = $page.url.pathname;
    if (p === '/admin') return '';
    if (p.startsWith('/admin/reclass')) return 'reclass';
    if (p.startsWith('/admin/payroll')) return 'payroll';
    if (p.startsWith('/admin/reports')) return 'reports';
    if (p.startsWith('/admin/finance')) return 'finance';
    if (p.startsWith('/admin/sis')) return 'sis';
    if (p.startsWith('/admin/communications')) return 'communications';
    if (p.startsWith('/admin/students') || p.startsWith('/admin/teachers') || p.startsWith('/admin/parents')
      || p.startsWith('/admin/subjects') || p.startsWith('/admin/scheduling') || p.startsWith('/admin/attendance')
      || p.startsWith('/admin/fees') || p.startsWith('/admin/teacher-invoices') || p.startsWith('/admin/parent-payments')
      || p.startsWith('/admin/credentials') || p.startsWith('/admin/settings') || p.startsWith('/admin/notifications')
      || p.startsWith('/admin/users')) return 'reclass';
    return '';
  });

  const currentModule = $derived(suiteModules.find(m => m.id === activeModule));

  const NAV = $derived(
    (roleNav[role] ?? roleNav.school_admin).map((g) => ({
      ...g,
      label: t(g.label),
      items: g.items.map((it) => ({ ...it, label: t(it.label) })),
    }))
  );

  const filteredNAV = $derived(
    activeModule ? NAV.filter(g => navGroupModule[g.label] === activeModule) : NAV
  );

  const openGroups = $state<Record<string, boolean>>({});

  $effect(() => {
    const initial = Object.fromEntries(filteredNAV.map(g => [g.label, g.defaultOpen ?? false]));
    Object.keys(initial).forEach(k => {
      if (!(k in openGroups)) openGroups[k] = initial[k as keyof typeof initial];
    });
  });

  let profileOpen = $state(false);
  let moreDrawerOpen = $state(false);

  const userName = $derived(user?.name ?? 'ReClass Admin');
  const userEmail = $derived(user?.email ?? 'admin@reclass.app');

  const allItems = $derived(filteredNAV.flatMap((group) => group.items));
  const navItemsVisible = $derived(allItems.length <= 4 ? allItems : allItems.slice(0, 3));
  const navItemsMore = $derived(allItems.length <= 4 ? [] : allItems.slice(3));

  $effect(() => {
    function handleClick(event: MouseEvent) {
      if (profileOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-profile-menu]')) {
          profileOpen = false;
        }
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  });

  $effect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && profileOpen) {
        profileOpen = false;
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  async function handleLogout() {
    goto('/api/logout');
  }

  function cycleTheme() {
    theme.update(($theme: Theme) => {
      if ($theme === 'light') return 'dark';
      if ($theme === 'dark') return 'system';
      return 'light';
    });
  }

  function cycleLocale() {
    locale.update(($locale: Locale) => {
      return $locale === 'en' ? 'sw' : 'en';
    });
  }
</script>

<div class="flex h-screen bg-transparent text-ink-700">
  <!-- Sidebar -->
  <aside class="hidden w-64 shrink-0 flex-col border-r border-border bg-white text-ink-700 md:flex">
    <div class="flex h-[4.5rem] items-center gap-3 border-b border-border px-5">
      {#if currentModule}
        <a href="/admin" class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br {accentGradients[currentModule.accent]} text-sm font-bold text-white shadow-sm">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="{moduleIcons[currentModule.icon]}" />
            </svg>
          </div>
          <div class="leading-tight">
            <p class="text-sm font-semibold text-ink-900">{currentModule.name}</p>
            <p class="text-[11px] text-ink-500">Remedial Suite</p>
          </div>
        </a>
      {:else}
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm">R</div>
          <div class="leading-tight">
            <p class="text-sm font-semibold text-ink-900">ReClass</p>
            <p class="text-[11px] text-ink-500">Remedial Suite</p>
          </div>
        </div>
      {/if}
    </div>

    {#if currentModule}
      <div class="border-b border-border px-3 py-2">
        <a href="/admin"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          All modules
        </a>
      </div>
    {/if}

    <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {#each filteredNAV as group}
        <div>
          <button
            onclick={() => openGroups[group.label] = !openGroups[group.label]}
            class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            {group.label}
            <svg class="w-3.5 h-3.5 transition-transform {openGroups[group.label] ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d={icons.chevron} />
            </svg>
          </button>
          {#if openGroups[group.label]}
            <ul class="mt-1 space-y-0.5">
              {#each group.items as item}
                {@const active = isActive($page.url.pathname, item.href)}
                <li>
                  <a
                    href={item.href}
                    class="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-colors {active
                      ? 'border-brand-100 bg-brand-50 text-brand-700 font-semibold'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'}"
                  >
                    {@html I(icons[item.icon ?? 'dashboard'] ?? icons.dashboard)}
                    {item.label}
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </nav>

    <div class="border-t border-border p-3">
      <div class="flex items-center gap-3 rounded-lg bg-ink-50 px-2 py-2.5">
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <div class="min-w-0 leading-tight">
          <p class="truncate text-sm font-medium text-ink-800">{userName}</p>
          <p class="truncate text-xs text-ink-500">{userEmail}</p>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main column -->
  <div class="flex-1 flex flex-col min-w-0">
    <header class="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white px-4 lg:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          {@html I(icons.dashboard)}
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold tracking-tight text-ink-900">{currentModule?.name ?? 'ReClass'}</p>
          <p class="truncate text-xs text-ink-400">{title}</p>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-3">
        {#if headerActions}
          {@render headerActions()}
        {/if}

        <button
          onclick={cycleTheme}
          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
          aria-label="Toggle dark mode"
          title="Toggle theme"
        >
          {@html I($theme === 'dark' ? icons.sun : icons.moon)}
        </button>

        <button
          onclick={cycleLocale}
          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
          aria-label="Toggle language"
          title="EN / SW"
        >
          {@html I(icons.globe)}
        </button>

        <div class="hidden items-center gap-2 rounded-md border border-border bg-ink-50 px-3 py-2 text-xs font-medium text-ink-500 sm:flex">
          <span class="h-2 w-2 rounded-full bg-success"></span>
          {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        <NotificationBell tenantId={$page.data.tenantId} />
        <div data-profile-menu class="relative">
          <button
            onclick={() => profileOpen = !profileOpen}
            class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            aria-label="Open profile menu"
          >
            {userName.slice(0, 1).toUpperCase()}
          </button>

          {#if profileOpen}
            <div class="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-white p-2 shadow-elevated">
              <div class="rounded-xl px-3 py-2">
                <p class="text-sm font-semibold text-ink-900">{userName}</p>
                <p class="text-xs text-ink-500">{userEmail}</p>
              </div>
              <div class="mt-1 space-y-1">
                <a href="/account" class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 15 0" />
                  </svg>
                  {t('profile')}
                </a>
                <a href="/admin/settings" class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.91.28.15.566.227.84.227.55 0 1.1-.25 1.47-.65l1.83-1.83a1.5 1.5 0 0 1 2.12 0l1.83 1.83a1.5 1.5 0 0 1 0 2.12l-1.83 1.83c-.4.37-.65.92-.65 1.47 0 .274.077.56.227.84.224.332.536.582.91.645l1.281.213c.542.09.94.56.94 1.11v2.593c0 .55-.398 1.02-.94 1.11l-1.281.213c-.374.063-.686.313-.91.645-.15.28-.227.566-.227.84 0 .55.25 1.1.65 1.47l1.83 1.83a1.5 1.5 0 0 1 0 2.12l-1.83 1.83a1.5 1.5 0 0 1-2.12 0l-1.83-1.83c-.37-.4-.92-.65-1.47-.65-.274 0-.56.077-.84.227-.332.224-.582.536-.645.91l-.213 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.91-.28-.15-.566-.227-.84-.227-.55 0-1.1.25-1.47.65l-1.83 1.83a1.5 1.5 0 0 1-2.12 0l-1.83-1.83a1.5 1.5 0 0 1 0-2.12l1.83-1.83c.4-.37.65-.92.65-1.47 0-.274-.077-.56-.227-.84-.224-.332-.536-.582-.91-.645L3.94 13.406c-.542-.09-.94-.56-.94-1.11V9.704c0-.55.398-1.02.94-1.11l1.281-.213c.374-.063.686-.313.91-.645.15-.28.227-.566.227-.84 0-.55-.25-1.1-.65-1.47L3.94 3.94a1.5 1.5 0 0 1 0-2.12l1.83-1.83a1.5 1.5 0 0 1 2.12 0l1.83 1.83c.37.4.92.65 1.47.65.274 0 .56-.077.84-.227.332-.224.582-.536.645-.91l.213-1.281Z" />
                  </svg>
                  {t('settings')}
                </a>
                <button
                  onclick={handleLogout}
                  class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  {t('logout')}
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <main class="flex-1 overflow-y-auto bg-canvas p-4 pb-24 sm:p-5 sm:pb-5 lg:p-6">
        <div class="w-full space-y-6">
          {@render children?.()}
        </div>
      </main>
      <NotificationToaster />
      {#if rightRail}
        <aside class="hidden w-80 shrink-0 overflow-y-auto border-l border-slate-200/80 bg-white/50 p-5 backdrop-blur-sm xl:block">
          {@render rightRail()}
        </aside>
      {/if}
    </div>
  </div>

  <!-- Mobile bottom nav -->
  <nav class="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden" aria-label="Primary navigation">
    {#each navItemsVisible as item}
      {@const active = isActive($page.url.pathname, item.href)}
      <a href={item.href} class="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium {active ? 'bg-brand-50 text-brand-700' : 'text-ink-500'}">
        {@html I(icons[item.icon ?? 'dashboard'] ?? icons.dashboard)}
        <span class="truncate">{item.label}</span>
      </a>
    {/each}
    {#if navItemsMore.length > 0}
      <button
        onclick={() => moreDrawerOpen = !moreDrawerOpen}
        class="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium {moreDrawerOpen ? 'bg-brand-50 text-brand-700' : 'text-ink-500'}"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        <span>More</span>
      </button>
    {/if}
  </nav>

  {#if moreDrawerOpen && navItemsMore.length > 0}
    <div
      class="fixed inset-0 z-40 bg-black/30 md:hidden"
      role="button"
      tabindex="0"
      onclick={() => moreDrawerOpen = false}
      onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') moreDrawerOpen = false; }}
      aria-label="Close navigation drawer"
    ></div>
    <div class="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border border-border bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-elevated md:hidden">
      <div class="flex items-center justify-between border-b border-border pb-3">
        <p class="text-sm font-semibold text-ink-900">Navigation</p>
        <button onclick={() => moreDrawerOpen = false} aria-label="Close drawer" class="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="mt-3 space-y-1">
        {#each navItemsMore as item}
          {@const active = isActive($page.url.pathname, item.href)}
          <a
            href={item.href}
            onclick={() => moreDrawerOpen = false}
            class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors {active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'}"
          >
            {@html I(icons[item.icon ?? 'dashboard'] ?? icons.dashboard)}
            {item.label}
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>
