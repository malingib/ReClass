<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { enhance } from '$app/forms';

  const { data, form } = $props();

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

  const modules = $derived(data.modules);
  const tenants = $derived(data.tenants ?? []);
</script>

<DashboardContent title="Module Provisioning" subtitle="Enable or disable modules per tenant — changes apply on next navigation">
  <div class="mb-6 rounded-xl border border-border bg-white p-5 shadow-card">
    <p class="text-sm text-ink-600">
      Each row toggles whether a tenant can access that module's dashboard and sidebar.
      <span class="font-medium text-ink-800">Platform</span> (settings &amp; integrations) is
      infrastructure and is always available.
    </p>
    {#if form?.error}
      <p class="mt-3 text-sm font-medium text-danger">{form.error}</p>
    {/if}
  </div>

  <div class="space-y-6">
    {#each tenants as t (t.id)}
      <div class="rounded-xl border border-border bg-white p-5 shadow-card">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-ink-900">{t.name}</h3>
            <p class="text-xs text-ink-400">{t.slug}</p>
          </div>
          <span class="rounded-md bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-500">
            {t.enabled.size}/{modules.length} enabled
          </span>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each modules as m (m.id)}
            {@const on = t.enabled.has(m.id)}
            <form method="POST" action="?/toggle" use:enhance class="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-ink-50/50 p-3">
              <input type="hidden" name="tenant_id" value={t.id} />
              <input type="hidden" name="module_id" value={m.id} />
              <input type="hidden" name="enabled" value={String(!on)} />
              <div class="flex items-center gap-2.5">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br {accentGradients[m.accent]} text-white">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                </span>
                <span class="text-sm font-medium text-ink-800">{m.name}</span>
              </div>
              <button type="submit" role="switch" aria-checked={on}
                class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {on ? 'bg-brand-600' : 'bg-ink-200'}"
                aria-label="Toggle {m.name} for {t.name}">
                <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {on ? 'translate-x-6' : 'translate-x-1'}"></span>
              </button>
            </form>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</DashboardContent>
