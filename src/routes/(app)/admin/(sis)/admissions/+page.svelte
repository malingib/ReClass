<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Plus, UserPlus, XCircle, CheckCircle2 } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import { dispatchToast } from '$lib/notifications';

  const { data } = $props();
  const admissions = $derived(data.admissions);
  const years = $derived(data.years);
  const groups = $derived(data.groups);
  let open = $state(false);
  let submitting = $state(false);

  function submit() {
    submitting = true;
    return async ({ update, result }: any) => {
      if (result.type === 'success') {
        open = false;
        dispatchToast('Saved', result.data?.message ?? 'Saved');
      } else if (result.type === 'failure') {
        dispatchToast('Error', result.data?.message ?? 'Please check the form.');
      }
      await update();
      submitting = false;
    };
  }
</script>

<DashboardContent title="Admissions" subtitle="Applications, admission decisions and conversion to enrolled students">
  {#snippet headerActions()}
    <Button onclick={() => (open = true)} size="sm"><Plus class="h-3.5 w-3.5" /> New Application</Button>
  {/snippet}

  <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
    <div class="rounded-xl border border-border bg-white p-4"><p class="text-xs text-muted-foreground">Pending</p><p class="mt-1 text-2xl font-semibold">{admissions.filter((a: any) => a.status === 'pending').length}</p></div>
    <div class="rounded-xl border border-border bg-white p-4"><p class="text-xs text-muted-foreground">Admitted</p><p class="mt-1 text-2xl font-semibold">{admissions.filter((a: any) => a.status === 'admitted').length}</p></div>
    <div class="rounded-xl border border-border bg-white p-4"><p class="text-xs text-muted-foreground">Rejected</p><p class="mt-1 text-2xl font-semibold">{admissions.filter((a: any) => a.status === 'rejected').length}</p></div>
    <div class="rounded-xl border border-border bg-white p-4"><p class="text-xs text-muted-foreground">Total</p><p class="mt-1 text-2xl font-semibold">{admissions.length}</p></div>
  </div>

  <div class="overflow-hidden rounded-xl border border-border bg-white">
    <div class="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
      <span>Application</span><span>Applicant</span><span>Year</span><span>Applying For</span><span>Status</span><span></span>
    </div>
    {#each admissions as a}
      <div class="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0">
        <div><p class="text-sm font-medium">{a.application_no}</p><p class="text-[11px] text-muted-foreground">{a.applied_on}</p></div>
        <div><p class="text-sm font-medium">{a.applicant_first_name} {a.applicant_middle_name ?? ''} {a.applicant_last_name}</p><p class="text-[11px] text-muted-foreground">{a.phone ?? 'No phone'}</p></div>
        <span class="text-sm">{a.academic_years?.name ?? '—'}</span>
        <span class="text-sm">{a.year_groups?.name ?? '—'}</span>
        <span class="inline-flex w-fit rounded-full bg-muted px-2 py-1 text-xs capitalize">{a.status}</span>
        <div class="flex gap-1">
          {#if a.status === 'pending'}
            <form method="POST" action="?/admit" use:enhance>
              <input type="hidden" name="id" value={a.id} /><input type="hidden" name="admission_no" value={a.application_no} />
              <Button size="icon" variant="ghost" title="Admit"><UserPlus class="h-4 w-4" /></Button>
            </form>
            <form method="POST" action="?/reject" use:enhance><input type="hidden" name="id" value={a.id} /><Button size="icon" variant="ghost" title="Reject"><XCircle class="h-4 w-4" /></Button></form>
          {:else if a.status === 'admitted'}
            <CheckCircle2 class="h-4 w-4 text-primary" />
          {/if}
        </div>
      </div>
    {:else}
      <div class="px-6 py-12 text-center text-sm text-muted-foreground">No admission applications yet.</div>
    {/each}
  </div>
</DashboardContent>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
    <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-white shadow-xl">
      <div class="flex items-center justify-between border-b border-border px-6 py-4"><div><h2 class="text-base font-semibold">New Admission Application</h2><p class="text-xs text-muted-foreground">No screening stage — application goes directly to an admission decision.</p></div><button class="text-muted-foreground" onclick={() => (open = false)}>×</button></div>
      <form method="POST" action="?/create" use:enhance={submit} class="grid gap-4 px-6 py-5 md:grid-cols-2">
        <label class="space-y-1 text-xs font-medium">Application No<input name="application_no" required class="field" placeholder="APP-2026-001" /></label>
        <label class="space-y-1 text-xs font-medium">Academic Year<select name="academic_year_id" required class="field">{#each years as y}<option value={y.id}>{y.name}{y.status === 'active' ? ' · Active' : ''}</option>{/each}</select></label>
        <label class="space-y-1 text-xs font-medium">First Name<input name="applicant_first_name" required class="field" /></label>
        <label class="space-y-1 text-xs font-medium">Middle Name<input name="applicant_middle_name" class="field" /></label>
        <label class="space-y-1 text-xs font-medium">Last Name<input name="applicant_last_name" required class="field" /></label>
        <label class="space-y-1 text-xs font-medium">Date of Birth<input name="date_of_birth" type="date" class="field" /></label>
        <label class="space-y-1 text-xs font-medium">Phone<input name="phone" class="field" /></label>
        <label class="space-y-1 text-xs font-medium">Email<input name="email" type="email" class="field" /></label>
        <label class="space-y-1 text-xs font-medium">Applying For<select name="applying_for_year_group_id" class="field"><option value="">Select year group</option>{#each groups as g}<option value={g.id}>{g.name}</option>{/each}</select></label>
        <label class="space-y-1 text-xs font-medium">Previous School<input name="previous_school" class="field" /></label>
        <label class="space-y-1 text-xs font-medium">Guardian Name<input name="guardian_name" class="field" /></label>
        <label class="space-y-1 text-xs font-medium">Guardian Relationship<input name="guardian_relationship" class="field" placeholder="Mother" /></label>
        <label class="space-y-1 text-xs font-medium">Guardian Phone<input name="guardian_phone" class="field" /></label>
        <label class="space-y-1 text-xs font-medium md:col-span-2">Notes<textarea name="notes" rows="3" class="field"></textarea></label>
        <div class="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Create Application'}</Button></div>
      </form>
    </div>
  </div>
{/if}

<style>
  :global(.field) { width: 100%; border: 1px solid hsl(var(--border)); border-radius: .5rem; padding: .55rem .7rem; font-size: .875rem; font-weight: 400; outline: none; }
  :global(.field:focus) { border-color: hsl(var(--primary)); box-shadow: 0 0 0 2px hsl(var(--primary) / .12); }
</style>
