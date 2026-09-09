<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>
<svelte:head><title>Lessons · eShule</title></svelte:head>
<div class="space-y-6 p-6">
  <div><p class="text-sm font-medium text-slate-500">Academics</p><h1 class="text-2xl font-semibold tracking-tight">Lesson Management</h1><p class="mt-1 text-sm text-slate-500">Schedule teacher lessons against the school's classes, subjects and rooms.</p></div>
  {#if form?.message}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}
  <div class="grid gap-6 lg:grid-cols-[390px_1fr]">
    <form method="POST" action="?/create" use:enhance class="space-y-4 rounded-xl border bg-white p-5 shadow-sm"><h2 class="font-semibold">Schedule lesson</h2>
      <label class="block text-sm font-medium">Teacher<select name="teacher_id" required class="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Select teacher</option>{#each data.teachers as t}<option value={t.id}>{t.profiles?.last_name}, {t.profiles?.first_name}</option>{/each}</select></label>
      <label class="block text-sm font-medium">Class / stream<select name="class_id" required class="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Select class</option>{#each data.classes as c}<option value={c.id}>{c.name}{c.stream ? ` · ${c.stream}` : ''}</option>{/each}</select></label>
      <label class="block text-sm font-medium">Subject<select name="subject_id" class="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Optional</option>{#each data.subjects as s}<option value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}</option>{/each}</select></label>
      <label class="block text-sm font-medium">Starts<input name="starts_at" type="datetime-local" required class="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label class="block text-sm font-medium">Ends<input name="ends_at" type="datetime-local" required class="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label class="block text-sm font-medium">Room<input name="room" class="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Room / hall" /></label>
      <label class="block text-sm font-medium">Notes<textarea name="notes" rows="2" class="mt-1 w-full rounded-lg border px-3 py-2"></textarea></label>
      <button class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Schedule lesson</button>
    </form>
    <section class="overflow-hidden rounded-xl border bg-white shadow-sm"><div class="border-b px-5 py-4"><h2 class="font-semibold">Lesson schedule</h2></div><div class="divide-y">{#each data.lessons as l}<article class="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p class="font-medium">{l.subjects?.name ?? 'Lesson'} · {l.sis_classes?.name}{l.sis_classes?.stream ? ` · ${l.sis_classes.stream}` : ''}</p><p class="text-sm text-slate-500">{l.teachers?.profiles?.last_name}, {l.teachers?.profiles?.first_name} · {new Date(l.starts_at).toLocaleString()} → {new Date(l.ends_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p></div><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{l.status}</span></article>{:else}<div class="px-5 py-10 text-center text-slate-500">No lessons scheduled.</div>{/each}</div></section>
  </div>
</div>
