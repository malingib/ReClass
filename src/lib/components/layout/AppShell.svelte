<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import NotificationToaster from '$lib/components/NotificationToaster.svelte';
  import { suiteModules, moduleIcons, routeFor, type SuiteModule } from '$lib/modules';
  import { roleLabels, roleRoutes, type Role } from '$lib/auth';

  const {
    title,
    subtitle: _subtitle = '',
    headerActions,
    rightRail,
    role = 'school_admin',
    roles = null,
    user = { name: 'eShule Admin', email: 'admin@eshule.app' },
    brandName = 'eShule',
    logoUrl = '',
    children,
  }: {
    title: string;
    subtitle?: string;
    headerActions?: import('svelte').Snippet;
    rightRail?: import('svelte').Snippet;
    role?: string;
    roles?: Role[] | null;
    user?: { name?: string; email?: string };
    brandName?: string;
    logoUrl?: string;
    children?: import('svelte').Snippet;
  } = $props();

  const brandLetter = $derived((brandName?.trim()?.[0] ?? 'e').toUpperCase());

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
  };

  const roleNav: Record<string, NavGroup[]> = {
    school_admin: [
      { label: 'Front office', defaultOpen: true, items: [
        { label: 'Parents', href: '/admin/parents', icon: 'parents' },
      ]},
      { label: 'Remedial program', defaultOpen: true, items: [
        { label: 'Remedial dashboard', href: '/admin/reclass', icon: 'dashboard' },
        { label: 'Subjects', href: '/admin/subjects', icon: 'subjects' },
        { label: 'Scheduling', href: '/admin/scheduling', icon: 'calendar' },
        { label: 'Teacher attendance', href: '/admin/attendance', icon: 'calendar' },
        { label: 'Remedial teacher payroll', href: '/admin/payroll', icon: 'invoices' },
        { label: 'Student ledger', href: '/admin/reclass/students', icon: 'students' },
      ]},
      { label: 'School fees', defaultOpen: true, items: [
        { label: 'Bursar & Finance', href: '/admin/finance', icon: 'fees' },
        { label: 'School fee definitions', href: '/admin/fees', icon: 'fees' },
        { label: 'School payroll', href: '/admin/finance/payroll', icon: 'invoices' },
        { label: 'School receipts', href: '/admin/finance/receipts', icon: 'invoices' },
        { label: 'Unmatched payments', href: '/admin/payments/unmatched', icon: 'bell' },
      ]},
      { label: 'Remedial M-Pesa', defaultOpen: true, items: [
        { label: 'Remedial fee definitions', href: '/admin/remedial-fees', icon: 'fees' },
        { label: 'M-Pesa Parent Payments', href: '/admin/parent-payments', icon: 'invoices' },
        { label: 'Remedial receipts', href: '/admin/remedial/receipts', icon: 'invoices' },
      ]},
      { label: 'SIS', defaultOpen: true, items: [
        { label: 'SIS Dashboard', href: '/admin/sis', icon: 'dashboard' },
        { label: 'Students', href: '/admin/students', icon: 'students' },
        { label: 'Teachers', href: '/admin/teachers', icon: 'teachers' },
        { label: 'Classes', href: '/admin/sis/classes', icon: 'subjects' },
        { label: 'Admissions', href: '/admin/sis/admissions', icon: 'students' },
      ]},
      { label: 'Communications', defaultOpen: true, items: [
        { label: 'Comms Dashboard', href: '/admin/communications', icon: 'dashboard' },
        { label: 'Announcements', href: '/admin/communications/announcements', icon: 'bell' },
        { label: 'Templates', href: '/admin/communications/templates', icon: 'invoices' },
        { label: 'Message Log', href: '/admin/notifications', icon: 'bell' },
      ]},
      { label: 'Integrations', defaultOpen: false, items: [
        { label: 'School settings', href: '/admin/settings', icon: 'dashboard' },
        { label: 'Users', href: '/admin/users', icon: 'students' },
      ]},
      { label: 'Reporting', defaultOpen: false, items: [
        { label: 'Reports', href: '/admin/reports', icon: 'fees' },
      ]},
    ],
    teacher: [
      { label: 'Teaching', defaultOpen: true, items: [
        { label: 'My dashboard', href: '/teacher', icon: 'dashboard' },
        { label: 'Remedial timetable', href: '/teacher/timetable', icon: 'calendar' },
        { label: 'My classes', href: '/teacher/classes', icon: 'subjects' },
        { label: 'Committee', href: '/teacher/committee', icon: 'teachers' },
      ]},
    ],
    parent: [
      { label: 'My child', defaultOpen: true, items: [
        { label: 'Welcome', href: '/parent', icon: 'dashboard' },
        { label: 'Child profile', href: '/parent/child', icon: 'students' },
        { label: 'Remedial timetable', href: '/parent/timetable', icon: 'calendar' },
        { label: 'Fee structure', href: '/parent/fees', icon: 'fees' },
        { label: 'Pay via M-Pesa', href: '/parent/pay', icon: 'invoices' },
        { label: 'Payment history', href: '/parent/payments', icon: 'invoices' },
      ]},
    ],
    principal: [
      { label: 'Oversight', defaultOpen: true, items: [
        { label: 'Remedial overview', href: '/principal', icon: 'dashboard' },
        { label: 'Program effectiveness', href: '/principal/effectiveness', icon: 'teachers' },
        { label: 'School overview', href: '/principal/school', icon: 'students' },
        { label: 'Reports', href: '/principal/reports', icon: 'fees' },
      ]},
    ],
    bursar: [
      { label: 'M-Pesa', defaultOpen: true, items: [
        { label: 'Workspace', href: '/bursar', icon: 'dashboard' },
        { label: 'Receipts', href: '/bursar/receipts', icon: 'invoices' },
      ]},
    ],
    super_admin: [
      { label: 'Platform', defaultOpen: true, items: [
        { label: 'Dashboard', href: '/super-admin', icon: 'dashboard' },
        { label: 'Tenants', href: '/super-admin/tenants', icon: 'groups' },
        { label: 'Module provisioning', href: '/super-admin/modules', icon: 'dashboard' },
        { label: 'Audit', href: '/super-admin/audit', icon: 'bell' },
        { label: 'Platform Settings', href: '/super-admin/settings', icon: 'settings' },
      ]},
    ],
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

  // Route → module context from the canonical registry (first prefix match
  // wins; '' on launcher/shared pages). Drives which nav groups show (module
  // isolation) and the module switcher accent.
  const activeModule = $derived(routeFor($page.url.pathname));

  const isModuleHub = $derived($page.url.pathname === '/admin' || $page.url.pathname === '/admin/modules');

  // Platform module (settings/integrations) isn't a picker card — show its
  // name and keep the "All modules" back-link working.
  const platformModule: SuiteModule = { id: 'platform', name: 'Platform', description: '', status: 'available', href: '/admin/settings', icon: 'reports', accent: 'slate' };

  const currentModule = $derived(
    suiteModules.find(m => m.id === activeModule) ?? (activeModule === 'platform' ? platformModule : undefined)
  );

  // Resolve the role's nav config. A missing key is a real config mistake (roles
  // are a closed enum in @eshule/shared) — fail visible with an empty nav + a
  // notice rather than silently rendering the admin's links.
  const roleNavConfig = $derived(roleNav[role] ?? null);
  const NAV = $derived.by(() => {
    if (!roleNavConfig) return [] as typeof roleNav.school_admin;
    return roleNavConfig.map((g) => ({
      ...g,
      label: g.label,
      items: g.items.map((it) => ({ ...it, label: it.label })),
    }));
  });

  // Per-item derivation (no group→module map): the admin shell shows a group
  // while the active module is present in it; non-admin portals show every item.
  const filteredNAV = $derived(
    isModuleHub
      ? []
      : NAV.map((g) => {
          if (role === 'school_admin' && activeModule) {
            const hasActiveModule = g.items.some((it) => routeFor(it.href) === activeModule);
            const isCrossCutting = ['platform', 'settings', 'users', 'reports'].includes(activeModule);
            if (!hasActiveModule && !isCrossCutting) return null;
          }
          return { ...g };
        }).filter((g): g is NonNullable<typeof g> => g !== null)
  );

  // Compute which groups should be open based on current route and defaults
  // Initialize lazily with filteredNAV data, then update reactively
  let openGroups = $state<Record<string, boolean>>({});
  
  // Initialize openGroups from filteredNAV on mount and update when filteredNAV changes
  $effect(() => {
    const nextGroups: Record<string, boolean> = {};
    filteredNAV.forEach((g) => {
      const matchesRoute = g.items.some((it) => $page.url.pathname.startsWith(it.href));
      nextGroups[g.label] = g.defaultOpen || matchesRoute;
    });
    openGroups = nextGroups;
  });

  let profileOpen = $state(false);
  let moreDrawerOpen = $state(false);
  let bellReady = $state(false);
  let roleOpen = $state(false);
  let roleSwitching = $state(false);

  const canSwitchRole = $derived(!!roles && roles.length > 1 && roles.some((r) => r === (role as Role)));

  async function switchRole(next: Role) {
    if (next === role || roleSwitching) return;
    roleSwitching = true;
    roleOpen = false;
    try {
      const res = await fetch('/api/role/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ role: next }).toString(),
      });
      if (res.redirected && res.url) {
        await goto(res.url);
      } else {
        await goto(roleRoutes[next]);
      }
    } finally {
      roleSwitching = false;
    }
  }

  // Defer NotificationBell mount until browser is idle so the query +
  // realtime subscription don't block first paint.
  $effect(() => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => { bellReady = true; });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(() => { bellReady = true; }, 100);
    return () => clearTimeout(t);
  });

  const userName = $derived(user?.name ?? 'eShule Admin');
  const userEmail = $derived(user?.email ?? 'admin@eshule.app');

  const allItems = $derived(filteredNAV.flatMap((group) => group.items));
  const navItemsVisible = $derived(allItems.length <= 5 ? allItems : allItems.slice(0, 4));
  const navItemsMore = $derived(allItems.length <= 5 ? [] : allItems.slice(4));

  $effect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (profileOpen && !target.closest('[data-profile-menu]')) {
        profileOpen = false;
      }
      if (roleOpen && !target.closest('[data-role-menu]')) {
        roleOpen = false;
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

  async   function handleLogout() {
    goto('/api/logout');
  }
</script>

<div class="flex h-screen bg-canvas">
  <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground">
    Skip to content
  </a>

  <!-- Sidebar -->
  <aside class={isModuleHub ? 'hidden' : 'hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex'}>
    <div class="flex h-14 items-center gap-2.5 border-b border-slate-200 px-4">
      {#if currentModule}
        <a href="/admin" class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg {accentGradients[currentModule.accent]} text-xs font-bold text-white">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="{moduleIcons[currentModule.icon]}" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-900 leading-tight">{currentModule.name}</p>
          </div>
        </a>
      {:else}
        <div class="flex items-center gap-2.5">
          {#if logoUrl}
            <img src={logoUrl} alt={brandName} class="h-8 w-8 rounded-lg object-contain" />
          {:else}
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">{brandLetter}</div>
          {/if}
          <p class="text-sm font-semibold text-slate-900">{brandName}</p>
        </div>
      {/if}
    </div>

    {#if currentModule}
      <div class="px-3 pt-3 pb-1">
        <a href="/admin/modules" class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700">
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          All modules
        </a>
      </div>
    {/if}

    <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-4">
      {#each filteredNAV as group}
        <div>
          <button
            onclick={() => openGroups[group.label] = !openGroups[group.label]}
            aria-expanded={openGroups[group.label] ?? group.defaultOpen ?? false}
            class="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400 hover:text-slate-600"
          >
            {group.label}
            <svg class="h-3 w-3 transition-transform {openGroups[group.label] ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d={icons.chevron} />
            </svg>
          </button>
          {#if openGroups[group.label]}
            <ul class="mt-0.5 space-y-px">
              {#each group.items as item}
                {@const active = isActive($page.url.pathname, item.href)}
                <li>
                  <a
                    href={item.href}
                    class="nav-item flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px] {active
                      ? 'bg-primary/8 text-primary font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}"
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

    <div class="border-t border-slate-200 p-3 space-y-1.5">
      {#if canSwitchRole}
        <div data-role-menu class="relative">
          <button
            onclick={() => roleOpen = !roleOpen}
            aria-expanded={roleOpen}
            class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 disabled:opacity-50"
            disabled={roleSwitching}
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {(roleLabels[role as Role] ?? role).slice(0, 1).toUpperCase()}
            </div>
            <div class="min-w-0 text-left">
              <p class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Acting as</p>
              <p class="truncate text-sm font-medium text-slate-900">{roleLabels[role as Role] ?? role}</p>
            </div>
            <svg class="ml-auto h-4 w-4 text-slate-400 transition-transform {roleOpen ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d={icons.chevron} />
            </svg>
          </button>
          {#if roleOpen}
            <div class="absolute bottom-full left-0 z-50 mb-1.5 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {#each (roles ?? []).filter((r): r is Role => r !== (role as Role)) as nextRole}
                <button
                  onclick={() => switchRole(nextRole)}
                  disabled={roleSwitching}
                  class="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span class="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                    {roleLabels[nextRole].slice(0, 1).toUpperCase()}
                  </span>
                  {roleLabels[nextRole]}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      <button
        onclick={() => profileOpen = !profileOpen}
        class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50"
      >
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <div class="min-w-0 text-left">
          <p class="truncate text-sm font-medium text-slate-900">{userName}</p>
          <p class="truncate text-xs text-slate-500">{userEmail}</p>
        </div>
        <svg class="ml-auto h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d={icons.chevron} />
        </svg>
      </button>
    </div>
  </aside>

  <!-- Main -->
  <div class="flex min-w-0 flex-1 flex-col">
    <header class="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <div class="min-w-0">
        {#if !isModuleHub && currentModule}
          <nav class="mb-0.5 flex items-center gap-1 text-xs text-slate-400" aria-label="Breadcrumb">
            <a href="/admin/modules" class="hover:text-slate-600 hover:underline">All modules</a>
            <span aria-hidden="true">›</span>
            <span class="font-medium text-slate-500">{currentModule.name}</span>
          </nav>
        {/if}
        <p class="text-sm font-semibold text-slate-900">{currentModule?.name ?? brandName}</p>
        <p class="text-xs text-slate-500">{title}</p>
      </div>

      <div class="ml-auto flex items-center gap-2">
        {#if headerActions}
          {@render headerActions()}
        {/if}

        <div class="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 sm:flex">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>

        {#if bellReady}
          <NotificationBell tenantId={$page.data.tenantId} />
        {/if}

        <div data-profile-menu class="relative">
      <button
        onclick={() => profileOpen = !profileOpen}
        class="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
        aria-label="Open profile menu"
      >
        {userName.slice(0, 1).toUpperCase()}
      </button>

          {#if profileOpen}
            <div class="absolute right-0 z-50 mt-1.5 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <div class="border-b border-slate-100 px-3 py-2">
                <p class="text-sm font-medium text-slate-900">{userName}</p>
                <p class="text-xs text-slate-500">{userEmail}</p>
              </div>
              <a href="/account" class="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Profile
              </a>
              <a href="/admin/settings" class="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Settings
              </a>
              <div class="border-t border-slate-100"></div>
              <button onclick={handleLogout} class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                Logout
              </button>
            </div>
          {/if}
        </div>
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <main id="main-content" class="flex-1 overflow-y-auto bg-slate-50 p-4 pb-20 sm:p-6 lg:p-8">
        <div class="mx-auto max-w-6xl space-y-6">
          {@render children?.()}
        </div>
      </main>
      {#if bellReady}
        <NotificationToaster />
      {/if}
      {#if rightRail}
        <aside class="hidden w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 xl:block">
          {@render rightRail()}
        </aside>
      {/if}
    </div>
  </div>

  <!-- Mobile bottom nav -->
  <nav class="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 md:hidden" aria-label="Primary navigation">
    {#each navItemsVisible as item}
      {@const active = isActive($page.url.pathname, item.href)}
      <a href={item.href} class="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium {active ? 'text-primary' : 'text-slate-500'}">
        {@html I(icons[item.icon ?? 'dashboard'] ?? icons.dashboard)}
        <span class="truncate">{item.label}</span>
      </a>
    {/each}
    {#if navItemsMore.length > 0}
      <button
        onclick={() => moreDrawerOpen = !moreDrawerOpen}
        class="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-slate-500"
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
      class="fixed inset-0 z-40 bg-black/20 md:hidden"
      role="button"
      tabindex="0"
      onclick={() => moreDrawerOpen = false}
      onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') moreDrawerOpen = false; }}
      aria-label="Close navigation drawer"
    ></div>
    <div class="fixed inset-x-0 bottom-0 z-50 rounded-t-lg border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-lg md:hidden">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-medium text-slate-900">Navigation</p>
        <button onclick={() => moreDrawerOpen = false} aria-label="Close drawer" class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="space-y-px">
        {#each navItemsMore as item}
          {@const active = isActive($page.url.pathname, item.href)}
          <a
            href={item.href}
            onclick={() => moreDrawerOpen = false}
            class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium {active ? 'bg-primary/8 text-primary' : 'text-slate-600 hover:bg-slate-50'}"
          >
            {@html I(icons[item.icon ?? 'dashboard'] ?? icons.dashboard)}
            {item.label}
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>
