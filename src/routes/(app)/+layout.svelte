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
  const subtitle = $derived(role === 'school_admin' ? 'School administration across SIS, remedial operations, finance, payroll, and communications'
    : role === 'teacher' ? 'Your teaching scope, delivery records, and assigned remedial responsibilities'
    : role === 'parent' ? 'View your child\'s progress and pay remedial tuition by M-Pesa'
    : role === 'principal' ? 'Oversight of remedial delivery, attendance review, and school performance'
    : role === 'bursar' ? 'School fee collection, reconciliation, and actual-payment receipts'
    : role === 'super_admin' ? 'Platform configuration, module provisioning, and audit oversight'
    : 'School management');

  const applyBrand = $derived(role !== 'super_admin' && !!data.brand?.brand_primary);
  const brandName = $derived(applyBrand ? (data.brand?.name ?? 'eShule') : 'eShule');
  const logoUrl = $derived(applyBrand ? (data.brand?.logo_url ?? '') : '');

  const brandStyle = $derived(
    applyBrand
      ? `:root{--color-primary:${data.brand?.brand_primary};--color-ring:${data.brand?.brand_primary};--color-brand-400:color-mix(in srgb, ${data.brand?.brand_primary} 82%, white);--color-brand-500:${data.brand?.brand_primary};--color-brand-600:color-mix(in srgb, ${data.brand?.brand_primary} 84%, black);--color-brand-700:color-mix(in srgb, ${data.brand?.brand_primary} 68%, black);}`
      : ''
  );
</script>

<svelte:head>
  {#if brandStyle}
    <style id="tenant-brand">{brandStyle}</style>
  {/if}
</svelte:head>

<AppShell {title} {subtitle} {role} roles={data.roles} user={cookieUser} {brandName} {logoUrl}>
  {@render children?.()}
</AppShell>