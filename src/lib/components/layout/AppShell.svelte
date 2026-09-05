<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import NotificationToaster from '$lib/components/NotificationToaster.svelte';
  import { suiteModules, moduleIcons, routeFor, type SuiteModule } from '$lib/modules';
  import { roleLabels, roleRoutes, type Role } from '$lib/auth';

  const {
    title,
    subtitle = '',
    headerActions,
    rightRail,
    role = 'school_admin',
    roles = null,
    user = { name: 'eShule Admin', email: 'admin@eshule.app' },
    brandName = 'eShule',
    logoUrl = '',
    canAccessCommittee = false,
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
    canAccessCommittee?: boolean;
    children?: import('svelte').Snippet;
  } = $props();

  interface NavItem { label: string; href: string; icon: keyof typeof icons; description?: string; }
  interface NavGroup { label: string; items: NavItem[]; defaultOpen?: boolean; }

  const icons = {
    home: 'M3 12l9-9 9 9M5 10v10h14V10M9 20v-6h6v6',
    students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    teachers: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM18 8a4 4 0 0 1 0 7.75',
    finance: 'M3 10h18M5 6h14a2 2 0 0 1 2 2v10H3V8a2 2 0 0 1 2-2ZM7 14h4',
    receipt: 'M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V4a2 2 0 0 1 2-2ZM9 9h6M9 13h6M9 17h3',
    calendar: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z',
    class: 'M4 5h16v14H4zM8 9h8M8 13h5',
    message: 'M4 5h16v11H8l-4 4V5Z',
    settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6v-2.4h.84A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.67 5.2V5h2.4v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03h.84v2.4h-.84A1.7 1.7 0 0 0 19.4 15Z',
    report: 'M5 20V10M12 20V4M19 20v-7',
    more: 'M6 12h.01M12 12h.01M18 12h.01',
    chevron: 'm6 9 6 6 6-6',
    arrow: 'M5 12h14M13 6l6 6-6 6',
  };

  const roleNav: Record<string, NavGroup[]> = {
    school_admin: [
      { label: 'Today', defaultOpen: true, items: [{ label: 'School dashboard', href: '/admin', icon: 'home' }] },
      { label: 'People & learning', defaultOpen: true, items: [
        { label: 'Students', href: '/admin/students', icon: 'students' },
        { label: 'Teachers', href: '/admin/teachers', icon: 'teachers' },
        { label: 'Classes', href: '/admin/sis/classes', icon: 'class' },
        { label: 'Admissions', href: '/admin/sis/admissions', icon: 'students' },
      ] },
      { label: 'Finance', defaultOpen: true, items: [
        { label: 'Bursar & Finance', href: '/admin/finance', icon: 'finance' },
        { label: 'Receipts', href: '/admin/finance/receipts', icon: 'receipt' },
        { label: 'Unmatched payments', href: '/admin/payments/unmatched', icon: 'receipt' },
        { label: 'School payroll', href: '/admin/finance/payroll', icon: 'receipt' },
      ] },
      { label: 'ReClass', defaultOpen: true, items: [
        { label: 'ReClass today', href: '/admin/reclass', icon: 'home' },
        { label: 'Scheduling', href: '/admin/scheduling', icon: 'calendar' },
        { label: 'Attendance', href: '/admin/attendance', icon: 'calendar' },
        { label: 'Student ledger', href: '/admin/reclass/students', icon: 'students' },
        { label: 'Remedial payroll', href: '/admin/payroll', icon: 'receipt' },
      ] },
      { label: 'Communication', defaultOpen: false, items: [
        { label: 'Announcements', href: '/admin/communications/announcements', icon: 'message' },
        { label: 'Message log', href: '/admin/notifications', icon: 'message' },
      ] },
      { label: 'Administration', defaultOpen: false, items: [
        { label: 'Parents', href: '/admin/parents', icon: 'students' },
        { label: 'Settings', href: '/admin/settings', icon: 'settings' },
        { label: 'Users', href: '/admin/users', icon: 'teachers' },
        { label: 'Reports', href: '/admin/analytics', icon: 'report' },
      ] },
    ],
    teacher: [
      { label: 'Today', defaultOpen: true, items: [
        { label: 'My dashboard', href: '/teacher', icon: 'home' },
        { label: 'Timetable', href: '/teacher/timetable', icon: 'calendar' },
        { label: 'My classes', href: '/teacher/classes', icon: 'class' },
      ] },
      ...(canAccessCommittee ? [{ label: 'Responsibilities', defaultOpen: true, items: [{ label: 'Committee', href: '/teacher/committee', icon: 'teachers' }] }] : []),
      { label: 'Account', defaultOpen: false, items: [{ label: 'Profile', href: '/account', icon: 'settings' }] },
    ],
    parent: [
      { label: 'My child', defaultOpen: true, items: [
        { label: 'Home', href: '/parent', icon: 'home' },
        { label: 'Child profile', href: '/parent/child', icon: 'students' },
        { label: 'Timetable', href: '/parent/timetable', icon: 'calendar' },
        { label: 'Fee structure', href: '/parent/fees', icon: 'finance' },
        { label: 'Pay via M-Pesa', href: '/parent/pay', icon: 'receipt' },
        { label: 'Payment history', href: '/parent/payments', icon: 'receipt' },
      ] },
    ],
    principal: [
      { label: 'Today', defaultOpen: true, items: [{ label: 'Overview', href: '/principal', icon: 'home' }] },
      { label: 'Oversight', defaultOpen: true, items: [
        { label: 'Program effectiveness', href: '/principal/effectiveness', icon: 'report' },
        { label: 'School overview', href: '/principal/school', icon: 'students' },
        { label: 'Reports', href: '/principal/reports', icon: 'report' },
      ] },
    ],
    bursar: [
      { label: 'Finance today', defaultOpen: true, items: [
        { label: 'Workspace', href: '/bursar', icon: 'home' },
        { label: 'Receipts', href: '/bursar/receipts', icon: 'receipt' },
      ] },
    ],
    super_admin: [
      { label: 'Platform', defaultOpen: true, items: [
        { label: 'Dashboard', href: '/super-admin', icon: 'home' },
        { label: 'Tenants', href: '/super-admin/tenants', icon: 'students' },
        { label: 'Modules', href: '/super-admin/modules', icon: 'class' },
        { label: 'Audit', href: '/super-admin/audit', icon: 'report' },
        { label: 'Settings', href: '/super-admin/settings', icon: 'settings' },
      ] },
    ],
  };

  const activeModule = $derived(routeFor($page.url.pathname));
  const isModuleHub = $derived($page.url.pathname === '/admin' || $page.url.pathname === '/admin/modules');
  const platformModule: SuiteModule = { id: 'platform', name: 'Platform', description: '', status: 'available', href: '/admin/settings', icon: 'reports', accent: 'slate' };
  const currentModule = $derived(suiteModules.find((m) => m.id === activeModule) ?? (activeModule === 'platform' ? platformModule : undefined));
  const NAV = $derived(roleNav[role] ?? []);
  const filteredNAV = $derived(isModuleHub ? NAV : NAV);
  const allItems = $derived(filteredNAV.flatMap((g) => g.items));

  const mobilePriority: Record<string, string[]> = {
    school_admin: ['/admin', '/admin/finance', '/admin/reclass', '/admin/students'],
    teacher: ['/teacher', '/teacher/timetable', '/teacher/classes'],
    parent: ['/parent', '/parent/pay', '/parent/payments'],
    principal: ['/principal', '/principal/effectiveness', '/principal/reports'],
    bursar: ['/bursar', '/bursar/receipts'],
    super_admin: ['/super-admin', '/super-admin/tenants', '/super-admin/audit'],
  };

  const mobileItems = $derived.by(() => {
    const priority = mobilePriority[role] ?? [];
    const ordered = priority.map((href) => allItems.find((item) => item.href === href)).filter(Boolean) as NavItem[];
    const rest = allItems.filter((item) => !priority.includes(item.href));
    return { visible: ordered.slice(0, 4), more: [...ordered.slice(4), ...rest] };
  });

  let openGroups = $state<Record<string, boolean>>({});
  let profileOpen = $state(false);
  let moreOpen = $state(false);
  let roleOpen = $state(false);
  let roleSwitching = $state(false);
  let bellReady = $state(false);

  $effect(() => {
    const next: Record<string, boolean> = {};
    for (const group of filteredNAV) {
      const active = group.items.some((item) => isActive($page.url.pathname, item.href));
      next[group.label] = active || !!group.defaultOpen;
    }
    openGroups = next;
  });

  $effect(() => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => (bellReady = true));
      return () => cancelIdleCallback(id);
    }
    const timer = setTimeout(() => (bellReady = true), 100);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        profileOpen = false;
        roleOpen = false;
        moreOpen = false;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  function isActive(pathname: string, href: string) {
    return href === '/admin' || href === '/teacher' || href === '/parent' || href === '/principal' || href === '/bursar' || href === '/super-admin'
      ? pathname === href
      : pathname.startsWith(href);
  }

  function iconPath(name: keyof typeof icons) {
    return icons[name] ?? icons.home;
  }

  async function switchRole(next: Role) {
    if (next === role || roleSwitching) return;
    roleSwitching = true;
    roleOpen = false;
    try {
      const response = await fetch('/api/role/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ role: next }).toString(),
      });
      await goto(response.redirected && response.url ? response.url : roleRoutes[next]);
    } finally {
      roleSwitching = false;
    }
  }

  function handleLogout() {
    goto('/api/logout');
  }

  const userName = $derived(user?.name ?? 'eShule Admin');
  const userEmail = $derived(user?.email ?? 'admin@eshule.app');
  const canSwitchRole = $derived(!!roles && roles.length > 1);
</script>

<div class="min-h-screen bg-slate-50 text-slate-900">
  <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground">Skip to content</a>

  <div class="flex min-h-screen">
    <aside class="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div class="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        {#if logoUrl}
          <img src={logoUrl} alt={brandName} class="h-9 w-9 rounded-lg object-contain" />
        {:else}
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">{brandName.slice(0, 1).toUpperCase()}</div>
        {/if}
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{brandName}</p>
          <p class="text-[11px] text-slate-500">{roleLabels[role as Role] ?? role}</p>
        </div>
      </div>

      {#if currentModule && !isModuleHub}
        <div class="px-3 pt-3">
          <a href="/admin/modules" class="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d={icons.arrow} stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
            All modules
          </a>
        </div>
      {/if}

      <nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {#each filteredNAV as group}
          <section class="mb-4">
            <button type="button" class="mb-1 flex min-h-8 w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400" onclick={() => (openGroups[group.label] = !openGroups[group.label])} aria-expanded={openGroups[group.label]}>
              <span>{group.label}</span>
              <svg class="h-3.5 w-3.5 transition-transform {openGroups[group.label] ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d={icons.chevron} stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            {#if openGroups[group.label]}
              <ul class="space-y-0.5">
                {#each group.items as item}
                  {@const active = isActive($page.url.pathname, item.href)}
                  <li>
                    <a href={item.href} aria-current={active ? 'page' : undefined} class="group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition {active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}">
                      <svg class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d={iconPath(item.icon)} stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
                      <span class="truncate">{item.label}</span>
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        {/each}
      </nav>

      <div class="border-t border-slate-200 p-3">
        {#if canSwitchRole}
          <div class="relative mb-1" data-role-menu>
            <button type="button" disabled={roleSwitching} onclick={() => (roleOpen = !roleOpen)} class="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left hover:bg-slate-50 disabled:opacity-60" aria-expanded={roleOpen}>
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{(roleLabels[role as Role] ?? role).slice(0, 1).toUpperCase()}</span>
              <span class="min-w-0 flex-1"><span class="block text-[10px] uppercase tracking-wider text-slate-400">Acting as</span><span class="block truncate text-xs font-semibold">{roleLabels[role as Role] ?? role}</span></span>
              <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d={icons.chevron} stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            {#if roleOpen}
              <div class="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {#each (roles ?? []).filter((r) => r !== role) as nextRole}
                  <button type="button" onclick={() => switchRole(nextRole)} class="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-50">{roleLabels[nextRole]}</button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
        <button type="button" onclick={() => (profileOpen = !profileOpen)} class="flex min-h-12 w-full items-center gap-3 rounded-lg px-2.5 text-left hover:bg-slate-50" aria-expanded={profileOpen}>
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{userName.slice(0, 1).toUpperCase()}</span>
          <span class="min-w-0 flex-1"><span class="block truncate text-xs font-semibold">{userName}</span><span class="block truncate text-[11px] text-slate-500">{userEmail}</span></span>
        </button>
        {#if profileOpen}
          <div class="mt-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
            <a href="/account" class="flex min-h-10 items-center rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-50">Profile</a>
            <a href="/admin/settings" class="flex min-h-10 items-center rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-50">Settings</a>
            <button type="button" onclick={handleLogout} class="flex min-h-10 w-full items-center rounded-lg px-2.5 text-sm text-red-600 hover:bg-red-50">Logout</button>
          </div>
        {/if}
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-[11px] text-slate-400">
            {#if currentModule && !isModuleHub}<span class="font-medium text-slate-500">{currentModule.name}</span>{/if}
            {#if currentModule && !isModuleHub}<span aria-hidden="true">/</span>{/if}
            <span class="truncate">{title}</span>
          </div>
          {#if subtitle}<p class="hidden truncate text-xs text-slate-500 sm:block">{subtitle}</p>{/if}
        </div>
        {#if headerActions}{@render headerActions()}{/if}
        <div class="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 lg:flex">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        {#if bellReady}<NotificationBell tenantId={$page.data.tenantId} />{/if}
        <div class="relative" data-profile-menu>
          <button type="button" onclick={() => (profileOpen = !profileOpen)} aria-label="Open profile menu" aria-expanded={profileOpen} class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-offset-2 transition hover:ring-2 hover:ring-primary/20 focus:outline-none focus:ring-2 focus:ring-primary">{userName.slice(0, 1).toUpperCase()}</button>
        </div>
      </header>

      <div class="flex min-h-0 flex-1">
        <main id="main-content" class="min-w-0 flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div class="mx-auto w-full max-w-7xl space-y-6">
            {@render children?.()}
          </div>
        </main>
        {#if rightRail}<aside class="hidden w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 xl:block">{@render rightRail()}</aside>{/if}
      </div>
    </div>
  </div>

  {#if bellReady}<NotificationToaster />{/if}

  <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/98 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] md:hidden" aria-label="Primary navigation">
    <div class="mx-auto flex max-w-lg items-stretch">
      {#each mobileItems.visible as item}
        {@const active = isActive($page.url.pathname, item.href)}
        <a href={item.href} aria-current={active ? 'page' : undefined} class="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold {active ? 'text-primary' : 'text-slate-500'}">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d={iconPath(item.icon)} stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <span class="max-w-full truncate">{item.label}</span>
        </a>
      {/each}
      {#if mobileItems.more.length > 0}
        <button type="button" onclick={() => (moreOpen = !moreOpen)} aria-expanded={moreOpen} class="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold text-slate-500">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d={icons.more} stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <span>More</span>
        </button>
      {/if}
    </div>
  </nav>

  {#if moreOpen}
    <div class="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-[1px] md:hidden" role="presentation" onclick={() => (moreOpen = false)} onkeydown={(event) => event.key === 'Escape' && (moreOpen = false)}></div>
    <section class="fixed inset-x-0 bottom-0 z-[60] max-h-[78vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl md:hidden" aria-label="More navigation">
      <div class="mx-auto mb-3 flex max-w-lg items-center justify-between">
        <div><p class="text-sm font-bold text-slate-900">More</p><p class="text-xs text-slate-500">Everything else in your workspace</p></div>
        <button type="button" onclick={() => (moreOpen = false)} aria-label="Close navigation" class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">×</button>
      </div>
      <div class="mx-auto max-w-lg space-y-5">
        {#each filteredNAV as group}
          <section>
            <p class="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.label}</p>
            <div class="grid grid-cols-2 gap-2">
              {#each group.items as item}
                {@const active = isActive($page.url.pathname, item.href)}
                {#if !mobileItems.visible.some((visible) => visible.href === item.href)}
                  <a href={item.href} onclick={() => (moreOpen = false)} aria-current={active ? 'page' : undefined} class="flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-xs font-semibold {active ? 'border-primary/20 bg-primary/10 text-primary' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}">
                    <svg class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d={iconPath(item.icon)} stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
                    <span>{item.label}</span>
                  </a>
                {/if}
              {/each}
            </div>
          </section>
        {/each}
      </div>
    </section>
  {/if}
</div>
