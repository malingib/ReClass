<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '$lib/components/ui/dialog/index.js';
  import { Plus, Trash2, ShieldCheck } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import type { ActionResult } from '@sveltejs/kit';
  import { dispatchToast } from '$lib/notifications';

  interface Teacher {
    id: string; first_name: string; last_name: string; employee_no: string | null;
    subjects: string[] | null; phone: string | null; id_number: string | null;
    teacher_type: 'remedial' | 'classroom' | 'both'; remedial_role: string;
  }
  interface ActionData extends Record<string, unknown> { message?: string; errors?: Record<string, string[]>; }

  const { data }: { data: PageData } = $props();
  const teachers = $derived(data.teachers);
  let formData = $state<Record<string, unknown>>({ teacher_type: 'classroom', remedial_role: 'none' });
  let errors = $state<Record<string, string[]>>({});
  let msg = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let submitting = $state(false);
  let showCreate = $state(false);
  let editingTeacher = $state<Teacher | null>(null);
  let deletingTeacher = $state<Teacher | null>(null);

  function handleSubmit() {
    submitting = true; errors = {}; msg = null;
    return async ({ result, update }: { result: ActionResult<ActionData, ActionData>; update: (_opts?: { reset?: boolean }) => void }) => {
      if (result.type === 'failure' && result.data) {
        if (result.data.errors) errors = result.data.errors;
        msg = { type: 'error', text: result.data.message ?? 'Please fix the highlighted fields.' };
        dispatchToast('Error', msg.text);
      } else if (result.type === 'success') {
        msg = { type: 'success', text: result.data?.message ?? 'Saved' };
        dispatchToast('Saved', msg.text); formData = { teacher_type: 'classroom', remedial_role: 'none' }; editingTeacher = null; showCreate = false;
      }
      update(); submitting = false;
    };
  }

  function openCreate() { formData = { teacher_type: 'classroom', remedial_role: 'none' }; editingTeacher = null; errors = {}; showCreate = true; }
  function openEdit(t: Teacher) {
    editingTeacher = t;
    formData = { id: t.id, first_name: t.first_name, last_name: t.last_name, employee_no: t.employee_no ?? '', subjects: t.subjects?.join(', ') ?? '', phone: t.phone ?? '', id_number: t.id_number ?? '', teacher_type: t.teacher_type ?? 'classroom', remedial_role: t.remedial_role ?? 'none' };
    errors = {}; showCreate = true;
  }
</script>

<DashboardContent title="Teachers" subtitle="Teaching staff, access scope and remedial committee responsibilities">
  {#snippet headerActions()}
    <Button onclick={openCreate} size="sm"><Plus class="h-3.5 w-3.5" /> Add Teacher</Button>
  {/snippet}

  <div class="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
    <div class="flex gap-3"><ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><p class="text-sm font-semibold text-slate-900">Access is assigned here</p><p class="mt-1 text-xs leading-5 text-slate-600">Teacher type controls the teaching surface. A remedial committee role adds governance duties without granting unrelated finance or SIS ownership.</p></div></div>
  </div>

  <DataTable data={teachers} columns={[
    { key: 'first_name', label: 'Name', render: (t: any) => `${t.first_name} ${t.last_name}`, sortable: true },
    { key: 'employee_no', label: 'Employee No', sortable: true },
    { key: 'teacher_type', label: 'Access scope', render: (t: any) => t.teacher_type === 'both' ? 'Remedial + classroom' : t.teacher_type === 'remedial' ? 'Remedial' : 'Classroom' },
    { key: 'remedial_role', label: 'Committee', render: (t: any) => t.remedial_role === 'none' ? '—' : t.remedial_role },
    { key: 'phone', label: 'Payout phone', render: (t: any) => t.phone ?? '—' },
  ]} emptyMessage="No teachers found" onEdit={openEdit} onDelete={(t: Teacher) => deletingTeacher = t} />
</DashboardContent>

<Dialog open={showCreate} onOpenChange={(o: boolean) => { if (!o) { showCreate = false; editingTeacher = null; } }}>
  <DialogContent class="sm:max-w-lg p-0">
    <DialogHeader class="border-b border-border px-6 py-4"><DialogTitle class="text-base font-semibold">{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle></DialogHeader>
    <form method="POST" action={editingTeacher ? '?/update' : '?/create'} use:enhance={handleSubmit} class="space-y-4 px-6 py-5">
      {#if editingTeacher}<input type="hidden" name="id" value={editingTeacher.id} />{/if}
      <div class="grid grid-cols-2 gap-4">
        <label class="space-y-1.5"><span class="text-xs font-medium">First name</span><input name="first_name" value={formData.first_name ?? ''} oninput={(e) => formData.first_name = e.currentTarget.value} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm" />{#if errors.first_name}<span class="text-xs text-destructive">{errors.first_name[0]}</span>{/if}</label>
        <label class="space-y-1.5"><span class="text-xs font-medium">Last name</span><input name="last_name" value={formData.last_name ?? ''} oninput={(e) => formData.last_name = e.currentTarget.value} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm" />{#if errors.last_name}<span class="text-xs text-destructive">{errors.last_name[0]}</span>{/if}</label>
      </div>
      <label class="block space-y-1.5"><span class="text-xs font-medium">Employee No</span><input name="employee_no" value={formData.employee_no ?? ''} oninput={(e) => formData.employee_no = e.currentTarget.value} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm" /></label>
      <label class="block space-y-1.5"><span class="text-xs font-medium">Teaching scope</span><select name="teacher_type" value={formData.teacher_type ?? 'classroom'} onchange={(e) => formData.teacher_type = e.currentTarget.value} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"><option value="classroom">Classroom teacher — SIS</option><option value="remedial">Remedial teacher — ReClass</option><option value="both">Both — SIS + ReClass</option></select></label>
      <label class="block space-y-1.5"><span class="text-xs font-medium">Remedial committee role</span><select name="remedial_role" value={formData.remedial_role ?? 'none'} onchange={(e) => formData.remedial_role = e.currentTarget.value} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"><option value="none">No committee role</option><option value="chairman">Chairman — review + payout authorization</option><option value="treasurer">Treasurer — payroll preparation + payout</option><option value="member">Member — attendance review</option></select></label>
      <label class="block space-y-1.5"><span class="text-xs font-medium">Subjects</span><input name="subjects" value={formData.subjects ?? ''} oninput={(e) => formData.subjects = e.currentTarget.value} placeholder="Math, English" class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm" /></label>
      <div class="grid grid-cols-2 gap-4"><label class="space-y-1.5"><span class="text-xs font-medium">Payout phone</span><input name="phone" value={formData.phone ?? ''} oninput={(e) => formData.phone = e.currentTarget.value} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm" /></label><label class="space-y-1.5"><span class="text-xs font-medium">National ID</span><input name="id_number" value={formData.id_number ?? ''} oninput={(e) => formData.id_number = e.currentTarget.value} class="w-full rounded-md border border-input bg-white px-3 py-2 text-sm" /></label></div>
      {#if msg}<div class="rounded-lg bg-slate-50 px-4 py-2 text-sm">{msg.text}</div>{/if}
      <DialogFooter><DialogClose><button type="button" class="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button></DialogClose><Button type="submit" disabled={submitting}>{editingTeacher ? 'Update' : 'Create'}</Button></DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<Dialog open={!!deletingTeacher} onOpenChange={(o: boolean) => { if (!o) deletingTeacher = null; }}>
  <DialogContent class="sm:max-w-sm p-0"><div class="px-6 py-5 text-center"><div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-destructive"><Trash2 class="h-6 w-6" /></div><h3 class="text-base font-semibold">Delete Teacher</h3><p class="mt-2 text-sm text-muted-foreground">Delete <strong>{deletingTeacher?.first_name} {deletingTeacher?.last_name}</strong>?</p></div><div class="flex justify-end gap-3 border-t border-border px-6 py-4"><DialogClose><button type="button" class="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button></DialogClose><form method="POST" action="?/delete" use:enhance><input type="hidden" name="id" value={deletingTeacher?.id ?? ''} /><Button type="submit" variant="destructive">Delete</Button></form></div></DialogContent>
</Dialog>