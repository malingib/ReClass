<script lang="ts">
  import { page } from '$app/stores';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import { roleLabels, roleRoutes, type Role } from '$lib/auth';

  let { children }: { children?: import('svelte').Snippet } = $props();

  function roleFromPath(pathname: string): Role | null {
    const prefix = '/' + pathname.split('/')[1];
    for (const [role, route] of Object.entries(roleRoutes)) {
      if (route === prefix) return role as Role;
    }
    if (pathname.startsWith('/notifications')) return 'school_admin';
    if (pathname.startsWith('/account')) return 'school_admin';
    return null;
  }

  let role = $derived(roleFromPath($page.url.pathname) ?? 'school_admin');

  let cookieUser = $state<{ name: string; email: string }>({ name: 'ReClass Admin', email: 'admin@reclass.app' });

  $effect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/x-reclass-user=([^;]+)/);
      if (match) {
        try {
          cookieUser = JSON.parse(decodeURIComponent(match[1]));
        } catch { /* ignore */ }
      }
    }
  });

  let title = $derived(`${roleLabels[role] ?? 'Admin'} Portal`);
  let subtitle = $derived(role === 'school_admin' ? 'Remedial scheduling, teacher attendance, and parent M-Pesa payments'
    : role === 'teacher' ? 'Mark your remedial sessions and confirm attendance'
    : role === 'parent' ? 'Pay remediation tuition by M-Pesa paybill and view progress'
    : role === 'principal' ? 'Approve teacher attendance and review remediation effectiveness'
    : role === 'bursar' ? 'Reconcile M-Pesa paybill callbacks to invoices and waivers'
    : role === 'super_admin' ? 'Tenants, payments health and audit across schools'
    : 'School management');
</script>

<AppShell {title} {subtitle} {role} user={cookieUser}>
  {@render children?.()}
</AppShell>
