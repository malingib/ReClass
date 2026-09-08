<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import NotificationToaster from '$lib/components/NotificationToaster.svelte';
  import { roleLabels, roleRoutes, type Role } from '$lib/auth';

  type IconName = 'home'|'students'|'teachers'|'finance'|'receipt'|'calendar'|'class'|'message'|'settings'|'report';
  type NavItem = { label:string; href:string; icon:IconName };
  type NavGroup = { label:string; items:NavItem[] };
  const icons: Record<IconName,string> = {
    home:'M3 12l9-9 9 9M5 10v10h14V10M9 20v-6h6v6',
    students:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    teachers:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM18 8a4 4 0 0 1 0 7.75',
    finance:'M3 10h18M5 6h14a2 2 0 0 1 2 2v10H3V8a2 2 0 0 1 2-2ZM7 14h4',
    receipt:'M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V4a2 2 0 0 1 2-2ZM9 9h6M9 13h6M9 17h3',
    calendar:'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z',
    class:'M4 5h16v14H4zM8 9h8M8 13h5',
    message:'M4 5h16v11H8l-4 4V5Z',
    settings:'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6v-2.4h.84A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06A1.7 1.7 0 0 0 12.67 5.2V5h2.4v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03h.84v2.4h-.84A1.7 1.7 0 0 0 19.4 15Z',
    report:'M5 20V10M12 20V4M19 20v-7'
  };

  type Props = {
    title:string; subtitle?:string; headerActions?:import('svelte').Snippet; rightRail?:import('svelte').Snippet;
    role?:Role; roles?:Role[]|null; user?:{name?:string;email?:string}; brandName?:string; logoUrl?:string;
    tenantId?:string|null; canAccessCommittee?:boolean; children?:import('svelte').Snippet;
  };
  const { title, subtitle='', headerActions, rightRail, role='school_admin', roles=null, user={name:'eShule Admin',email:'admin@eshule.app'}, brandName='eShule', logoUrl='', tenantId=null, canAccessCommittee=false, children } = $props<Props>();

  const adminNav: NavGroup[] = [
    {label:'Today',items:[{label:'Dashboard',href:'/admin',icon:'home'}]},
    {label:'Students',items:[{label:'Students',href:'/admin/students',icon:'students'},{label:'Admissions',href:'/admin/sis/admissions',icon:'students'},{label:'Classes',href:'/admin/sis/classes',icon:'class'},{label:'Teachers',href:'/admin/teachers',icon:'teachers'}]},
    {label:'ReClass',items:[{label:'Overview',href:'/admin/reclass',icon:'home'},{label:'Scheduling',href:'/admin/scheduling',icon:'calendar'},{label:'Attendance',href:'/admin/attendance',icon:'calendar'},{label:'Student ledger',href:'/admin/reclass/students',icon:'students'}]},
    {label:'Finance',items:[{label:'Finance',href:'/admin/finance',icon:'finance'},{label:'Receipts',href:'/admin/finance/receipts',icon:'receipt'},{label:'Payroll',href:'/admin/finance/payroll',icon:'receipt'}]},
    {label:'Operations',items:[{label:'Calendar',href:'/admin/calendar',icon:'calendar'},{label:'Lessons',href:'/admin/lessons',icon:'class'},{label:'Announcements',href:'/admin/communications/announcements',icon:'message'},{label:'Notifications',href:'/admin/notifications',icon:'message'}]},
    {label:'Insights',items:[{label:'Analytics',href:'/admin/analytics',icon:'report'},{label:'Reports',href:'/admin/reports',icon:'report'}]},
    {label:'Administration',items:[{label:'Parents',href:'/admin/parents',icon:'students'},{label:'Users',href:'/admin/users',icon:'teachers'},{label:'Settings',href:'/admin/settings',icon:'settings'}]}
  ];
  const roleNav: Record<Role,NavGroup[]> = {
    school_admin:adminNav,
    teacher:[{label:'Today',items:[{label:'Dashboard',href:'/teacher',icon:'home'},{label:'Timetable',href:'/teacher/timetable',icon:'calendar'},{label:'Classes',href:'/teacher/classes',icon:'class'}]},...(canAccessCommittee?[{label:'Responsibilities',items:[{label:'Committee',href:'/teacher/committee',icon:'teachers'}]}]:[]),{label:'Account',items:[{label:'Profile',href:'/account',icon:'settings'}]}],
    parent:[{label:'My child',items:[{label:'Home',href:'/parent',icon:'home'},{label:'Profile',href:'/parent/child',icon:'students'},{label:'Timetable',href:'/parent/timetable',icon:'calendar'},{label:'Fees',href:'/parent/fees',icon:'finance'},{label:'Pay',href:'/parent/pay',icon:'receipt'},{label:'Payments',href:'/parent/payments',icon:'receipt'}]}],
    principal:[{label:'Today',items:[{label:'Overview',href:'/principal',icon:'home'}]},{label:'Insights',items:[{label:'Effectiveness',href:'/principal/effectiveness',icon:'report'},{label:'School overview',href:'/principal/school',icon:'students'},{label:'Reports',href:'/principal/reports',icon:'report'}]}],
    bursar:[{label:'Finance',items:[{label:'Workspace',href:'/bursar',icon:'home'},{label:'Receipts',href:'/bursar/receipts',icon:'receipt'}]}],
    super_admin:[{label:'Platform',items:[{label:'Dashboard',href:'/super-admin',icon:'home'},{label:'Tenants',href:'/super-admin/tenants',icon:'students'},{label:'Modules',href:'/super-admin/modules',icon:'class'},{label:'Audit',href:'/super-admin/audit',icon:'report'},{label:'Settings',href:'/super-admin/settings',icon:'settings'}]}]
  };
  const nav = $derived(roleNav[role] ?? adminNav);
  const allItems = $derived(nav.flatMap((group) => group.items));
  const mobileItems = $derived(allItems.slice(0,4));
  let profileOpen=$state(false); let moreOpen=$state(false);
  function isActive(href:string){const roots=['/admin','/teacher','/parent','/principal','/bursar','/super-admin'];return roots.includes(href)?$page.url.pathname===href:$page.url.pathname.startsWith(href);}
  function handleLogout(){goto('/api/logout');}
  async function switchRole(next:Role){if(next===role)return;const response=await fetch('/api/role/switch',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({role:next}).toString()});await goto(response.redirected&&response.url?response.url:roleRoutes[next]);}
</script>

<div class="min-h-screen bg-slate-50 text-slate-900"><a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a><div class="flex min-h-screen">
<aside class="hidden w-64 shrink-0 border-r bg-white lg:flex lg:flex-col"><div class="flex h-16 items-center gap-3 border-b px-5"><a href={roleRoutes[role]} class="flex items-center gap-2">{#if logoUrl}<img src={logoUrl} alt={brandName} class="h-9 w-9 rounded-lg object-contain" />{:else}<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">e</span>{/if}<span class="text-lg font-semibold">{brandName}</span></a></div><nav class="flex-1 overflow-y-auto px-3 py-4">{#each nav as group}<section class="mb-5"><div class="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</div><div class="space-y-1">{#each group.items as item}<a href={item.href} class={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive(item.href)?'bg-primary/10 font-semibold text-primary':'text-slate-600 hover:bg-slate-100'}`}><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d={icons[item.icon]} stroke-linecap="round" stroke-linejoin="round" /></svg><span>{item.label}</span></a>{/each}</div></section>{/each}</nav><div class="border-t p-3"><button type="button" onclick={handleLogout} class="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">Sign out</button></div></aside>
<div class="flex min-w-0 flex-1 flex-col"><header class="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-6"><div class="min-w-0"><h1 class="truncate text-base font-semibold sm:text-lg">{title}</h1>{#if subtitle}<p class="hidden truncate text-xs text-slate-500 sm:block">{subtitle}</p>{/if}</div><div class="flex items-center gap-2">{#if headerActions}{@render headerActions()}{/if}{#if tenantId}<NotificationBell tenantId={tenantId}/>{/if}<button type="button" onclick={()=>profileOpen=!profileOpen} class="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"><span class="hidden text-right sm:block"><span class="block text-xs font-medium">{user?.name??'eShule Admin'}</span><span class="block text-[11px] text-slate-500">{user?.email??''}</span></span><span class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">{(user?.name??'e').slice(0,1).toUpperCase()}</span></button></div></header><main id="main-content" class="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-6">{#if children}{@render children()}{/if}</main>{#if rightRail}{@render rightRail()}{/if}</div></div>
<nav class="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 py-2 lg:hidden"><div class="mx-auto flex max-w-xl items-center justify-around">{#each mobileItems as item}<a href={item.href} class={`flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] ${isActive(item.href)?'font-semibold text-primary':'text-slate-500'}`}><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d={icons[item.icon]}/></svg><span>{item.label}</span></a>{/each}<button type="button" onclick={()=>moreOpen=!moreOpen} class="flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-slate-500"><span class="text-lg">•••</span><span>More</span></button></div></nav>
{#if profileOpen}<div class="fixed right-3 top-14 z-50 w-64 rounded-xl border bg-white p-2 shadow-xl"><div class="border-b px-3 py-2"><div class="text-sm font-medium">{user?.name??'eShule Admin'}</div><div class="text-xs text-slate-500">{user?.email??''}</div></div>{#if roles&&roles.length>1}<div class="border-b py-1">{#each roles as r}<button type="button" onclick={()=>switchRole(r)} class="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">{roleLabels[r]}</button>{/each}</div>{/if}<button type="button" onclick={handleLogout} class="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600">Sign out</button></div>{/if}
{#if moreOpen}<div class="fixed inset-x-3 bottom-16 z-50 max-h-[60vh] overflow-y-auto rounded-xl border bg-white p-2 shadow-xl lg:hidden">{#each allItems.slice(4) as item}<a href={item.href} class="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">{item.label}</a>{/each}</div>{/if}<NotificationToaster/></div>
