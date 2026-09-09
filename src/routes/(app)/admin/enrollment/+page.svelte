<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>
<svelte:head><title>Enrollment · eShule</title></svelte:head>
<div class="space-y-6 p-6">
  <div><p class="text-sm font-medium text-slate-500">Students</p><h1 class="text-2xl font-semibold tracking-tight">Enrollment</h1><p class="mt-1 text-sm text-slate-500">Enroll students without overwriting academic history.</p></div>
  <div class="grid gap-6 lg:grid-cols-[360px_1fr]">
    <form method="POST" action="?/create" use:enhance class="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <h2 class="font-semibold">New enrollment</h2>
      {#if form?.message}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}
      <label class="block text-sm font-medium">Student<select name="student_id" required class="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Select student</option>{#each data.students as s}<option value={s.id}>{s.last_name}, {s.first_name} · {s.admission_no}</option>{/each}</select></label>
      <label class="block text-sm font-medium">Class / stream<select name="class_id" required class="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Select class</option>{#each data.classes as c}<option value={c.id}>{c.name}{c.stream ? ` · ${c.stream}` : ''} · {c.code}</option>{/each}</select></label>
      <label class="block text-sm font-medium">Academic year<input name="academic_year" required placeholder="2026" class="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label class="block text-sm font-medium">Enrollment date<input name="enrolled_at" type="date" required class="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <button class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Enroll student</button>
    </form>
    <section class="overflow-hidden rounded-xl border bg-white shadow-sm"><div class="border-b px-5 py-4"><h2 class="font-semibold">Recent enrollments</h2></div><div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-5 py-3">Student</th><th class="px-5 py-3">Class</th><th class="px-5 py-3">Year</th><th class="px-5 py-3">Status</th></tr></thead><tbody>{#each data.enrollments as e}<tr class="border-t"><td class="px-5 py-3 font-medium">{e.students?.last_name}, {e.students?.first_name}<div class="text-xs text-slate-500">{e.students?.admission_no}</div></td><td class="px-5 py-3">{e.sis_classes?.name}{e.sis_classes?.stream ? ` · ${e.sis_classes.stream}` : ''}</td><td class="px-5 py-3">{e.academic_year}</td><td class="px-5 py-3"><span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{e.status}</span></td></tr>{:else}<tr><td colspan="4" class="px-5 py-10 text-center text-slate-500">No enrollments yet.</td></tr>{/each}</tbody></table></div></section>
  </div>
</div>
