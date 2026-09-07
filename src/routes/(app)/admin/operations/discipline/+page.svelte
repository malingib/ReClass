<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { ClipboardList, Plus, CheckCircle2 } from 'lucide-svelte';
  const { data } = $props();
  const cases = $derived(data.cases ?? []);
  const students = $derived(data.students ?? []);
  const name = (id: string) => { const s = students.find((x: any) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : 'Student'; };
</script>
<svelte:head><title>Discipline · eShule</title></svelte:head>
<DashboardContent title="Discipline" subtitle="Record incidents, follow up, and close cases with an auditable trail.">
  <div class="space-y-6">
    <section class="ui-card p-5 sm:p-6"><div class="flex items-center gap-2 mb-5"><Plus class="h-5 w-5 text-primary"/><h2 class="text-lg font-semibold">Record incident</h2></div>
      <form method="POST" action="?/create" class="grid gap-4 md:grid-cols-2">
        <label class="text-sm">Student<select name="student_id" required class="ui-input mt-1 w-full"><option value="">Select student</option>{#each students as s}<option value={s.id}>{s.first_name} {s.last_name} · {s.admission_no}</option>{/each}</select></label>
        <label class="text-sm">Incident date<input name="incident_date" type="date" value={new Date().toISOString().slice(0,10)} required class="ui-input mt-1 w-full"/></label>
        <label class="text-sm">Category<select name="category" class="ui-input mt-1 w-full"><option>conduct</option><option>attendance</option><option>academic</option><option>bullying</option><option>property</option><option>other</option></select></label>
        <label class="text-sm">Severity<select name="severity" class="ui-input mt-1 w-full"><option>minor</option><option>moderate</option><option>major</option><option>critical</option></select></label>
        <label class="text-sm md:col-span-2">Description<textarea name="description" required rows="3" class="ui-input mt-1 w-full"></textarea></label>
        <label class="text-sm">Action taken<input name="action_taken" class="ui-input mt-1 w-full"/></label>
        <label class="text-sm">Follow-up date<input name="follow_up_date" type="date" class="ui-input mt-1 w-full"/></label>
        <div><button class="ui-action ui-action-primary"><Plus class="h-4 w-4"/>Save incident</button></div>
      </form>
    </section>
    <section class="ui-card overflow-hidden"><div class="border-b border-border/60 px-5 py-4"><h2 class="text-lg font-semibold">Case register</h2></div>
      {#if cases.length === 0}<div class="p-10 text-center"><ClipboardList class="mx-auto h-8 w-8 text-ink-300"/><p class="mt-3 text-sm font-semibold">No discipline cases</p></div>{:else}<div class="divide-y divide-border/60">{#each cases as c}<article class="p-5"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 class="font-semibold text-ink-900">{name(c.student_id)}</h3><p class="mt-1 text-xs text-ink-500">{c.incident_date} · {c.category} · {c.severity}</p><p class="mt-3 text-sm text-ink-600 whitespace-pre-wrap">{c.description}</p>{#if c.action_taken}<p class="mt-2 text-xs text-ink-500">Action: {c.action_taken}</p>{/if}</div><div class="flex items-center gap-2"><span class="ui-status {c.status === 'resolved' || c.status === 'closed' ? 'ui-status-success' : 'ui-status-warning'}">{c.status}</span>{#if c.status !== 'resolved' && c.status !== 'closed'}<form method="POST" action="?/resolve"><input type="hidden" name="id" value={c.id}/><button class="ui-action ui-action-secondary"><CheckCircle2 class="h-4 w-4"/>Resolve</button></form>{/if}</div></div></article>{/each}</div>{/if}
    </section>
  </div>
</DashboardContent>
