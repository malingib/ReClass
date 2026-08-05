<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { enhance } from '$app/forms';

  const { data, form } = $props();
  const unmatched = $derived(data.unmatched ?? []);
  const students = $derived(data.students ?? []);
  const feeTypes = $derived(data.feeTypes ?? []);
</script>

<DashboardContent title="Unmatched Payments" subtitle="Manual M-Pesa deposits that could not be routed to a student automatically">
  {#if form?.error}
    <div class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">Deposit matched — receipt created and audit-logged.</div>
  {/if}

  {#if unmatched.length === 0}
    <div class="mt-4 rounded-xl border border-border bg-white p-8 text-center shadow-card">
      <p class="text-sm text-ink-500">No unmatched deposits. 🎉</p>
      <p class="mt-1 text-xs text-ink-400">
        Manual paybill payments with an unknown admission number land here. Payments with a valid admission number are routed automatically.
      </p>
    </div>
  {:else}
    <div class="mt-4 space-y-4">
      {#each unmatched as u (u.id)}
        <div class="rounded-xl border border-border bg-white p-5 shadow-card">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-ink-900">KES {Number(u.amount).toLocaleString()}</p>
              <p class="mt-0.5 text-xs text-ink-500">
                {u.bill_ref ? `Adm ref: ${u.bill_ref} · ` : ''}{u.mpesa_receipt ?? u.checkout_id?.slice(0, 10)}
                {u.phone ? ` · ${u.phone}` : ''}
              </p>
              <p class="text-xs text-ink-400">{new Date(u.created_at).toLocaleString()}</p>
            </div>
            <form method="POST" action="?/match" use:enhance class="flex flex-wrap items-end gap-2">
              <input type="hidden" name="unmatched_id" value={u.id} />
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-ink-600">Student</span>
                <select name="student_id" required class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900">
                  <option value="">Select…</option>
                  {#each students as s}
                    <option value={s.id}>{s.first_name} {s.last_name} · {s.admission_no}</option>
                  {/each}
                </select>
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-ink-600">Fee (optional)</span>
                <select name="fee_type_id" class="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900">
                  <option value="">—</option>
                  {#each feeTypes as f}
                    <option value={f.id}>{f.name} · KES {Number(f.amount).toLocaleString()} · {f.domain === 'school' ? 'School' : 'Remedial'}</option>
                  {/each}
                </select>
              </label>
              <button type="submit" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
                Match &amp; create receipt
              </button>
            </form>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</DashboardContent>
