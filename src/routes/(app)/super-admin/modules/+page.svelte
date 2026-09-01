<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { suiteModules } from '$lib/modules';

  const { data } = $props();
  const overrides = $derived(new Map((data.tenantModules ?? []).map((r: any) => [r.module_id, r.enabled])));
  const rows = $derived(
    suiteModules.map((m) => ({
      ...m,
      enabled: overrides.has(m.id) ? overrides.get(m.id) : m.status === 'available',
      provisionable: (['remedial','finance','communications','reports'] as string[]).includes(m.id),
    }))
  );
</script>

<DashboardContent title="Module provisioning" subtitle="Platform-wide module catalog — single-tenant: all available modules are active">
  <DataTable data={rows} columns={[
    { key: 'name', label: 'Module', render: (r: any) => `<span class="font-medium text-slate-900">${r.name}</span><div class="text-xs text-slate-500">${r.id} · ${r.status}</div>` },
    { key: 'description', label: 'Description', render: (r: any) => `<span class="text-sm text-slate-600">${r.description}</span>` },
    { key: 'provisionable', label: 'Provisionable', render: (r: any) => r.provisionable ? '<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">yes</span>' : '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">kernel</span>' },
    { key: 'enabled', label: 'Active', render: (r: any) => r.enabled ? '<span class="text-emerald-600 font-medium">Active</span>' : '<span class="text-slate-400">Disabled</span>' },
  ]} emptyMessage="No modules" />
  <p class="text-xs text-slate-500">Whitelabel branding is per-tenant (Admin → Settings). This catalog controls which satellite modules the platform exposes — no per-tenant toggle is needed in single-tenant mode.</p>
</DashboardContent>
