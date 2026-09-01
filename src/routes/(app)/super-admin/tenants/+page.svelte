<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';

  const { data } = $props();
  const tenants = $derived(data.tenants as any[]);
  const counts = $derived((data.counts ?? {}) as Record<string, number>);
</script>

<DashboardContent title="Tenants" subtitle="All schools on the platform — platform owner view">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <KpiCard label="Tenants" value={tenants.length} sub="Active schools" />
    <KpiCard label="Total users" value={Object.values(counts).reduce((a, b) => a + b, 0)} sub="Across all tenants" />
    <KpiCard label="Deployment" value="Single-tenant" sub="TENANT_ID = Malingi High" />
  </div>

  <Card>
    <CardContent class="p-0">
      <DataTable data={tenants} columns={[
        {
          key: 'name',
          label: 'School',
          html: true,
          render: (t: any) => {
            const logo = t.logo_url ? `<img src="${t.logo_url}" alt="" class="h-7 w-7 rounded-md object-contain border border-slate-200" />` : `<span class="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">${(t.name?.[0] ?? '?').toUpperCase()}</span>`;
            return `<div class="flex items-center gap-3"><div>${logo}</div><div><div class="font-medium text-slate-900">${t.name ?? '—'}</div><div class="text-xs text-slate-500">${t.slug ?? ''} · ${t.academic_year ?? '—'}</div></div></div>`;
          },
        },
        {
          key: 'brand_primary',
          label: 'Brand',
          html: true,
          render: (t: any) => `<div class="flex items-center gap-2"><span class="h-4 w-4 rounded-full border border-slate-200" style="background:${t.brand_primary ?? '#64748b'}"></span><span class="font-mono text-xs text-slate-600">${t.brand_primary ?? '—'}</span></div>`,
        },
        { key: 'currency', label: 'Currency' },
        { key: 'timezone', label: 'Timezone' },
        {
          key: 'users',
          label: 'Users',
          html: true,
          render: (t: any) => `<span class="font-medium">${counts[t.id] ?? 0}</span>`,
        },
        { key: 'created_at', label: 'Created', render: (t: any) => t.created_at ? new Date(t.created_at).toLocaleDateString() : '—' },
      ]} emptyMessage="No tenants found" />
    </CardContent>
  </Card>

  <p class="text-xs text-slate-500">
    Tenant branding (name · logo · brand colour) is managed by the school admin at
    <span class="font-medium text-slate-700">Admin → Settings</span> and whitelabels the school app.
    The platform dashboard keeps the operator brand.
  </p>
</DashboardContent>
