<script lang="ts">
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import { roleLabels, type Role } from '$lib/auth';

  const { data, children } = $props<import('./$types').LayoutData>();

  const role = $derived<Role>((data.role ?? 'school_admin') as Role);

  let cookieUser = $state<{ name: string; email: string }>({ name: 'eShule Admin', email: 'admin@eshule.app' });

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

  const title = $derived(`${roleLabels[role] ?? 'Admin'} Portal`);
  const subtitle = $derived(role === 'school_admin' ? 'Remedial scheduling, teacher attendance, and parent M-Pesa payments'
    : role === 'teacher' ? 'Mark your remedial sessions and confirm attendance'
    : role === 'parent' ? 'Pay remediation tuition by M-Pesa paybill and view progress'
    : role === 'principal' ? 'Approve teacher attendance and review remediation effectiveness'
    : role === 'bursar' ? 'Reconcile M-Pesa paybill callbacks to invoices and waivers'
    : role === 'super_admin' ? 'Tenants, payments health and audit across schools'
    : 'School management');
</script>

<AppShell {title} {subtitle} {role} roles={data.roles} user={cookieUser} enabledModules={data.enabledModules} impersonating={data.impersonating}>
  {@render children?.()}
</AppShell>
