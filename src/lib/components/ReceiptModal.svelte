<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { enhance } from '$app/forms';

  const {
    open,
    onOpenChange,
    payment,
    students,
    feeTypes,
  }: {
    open: boolean;
    onOpenChange: (_value: boolean) => void;
    payment: any | null;
    students: any[];
    feeTypes: any[];
  } = $props();

  // Printable receipt fields derived from the payment row.
  const studentName = $derived(
    payment?.students ? `${payment.students.first_name ?? ''} ${payment.students.last_name ?? ''}`.trim() : '—'
  );
  const feeName = $derived(payment?.fee_types?.name ?? '—');
  const channel = $derived(
    payment?.method === 'bank'
      ? `Bank${payment.bank_name ? ` (${payment.bank_name})` : ''}`
      : `M-Pesa${payment?.mpesa_receipt ? ` (${payment.mpesa_receipt})` : ''}`
  );
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white p-0 shadow-elevated"
    >
      {#if payment}
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <Dialog.Title class="text-base font-semibold text-ink-900">Receipt &amp; edit</Dialog.Title>
          <Dialog.Close class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700" aria-label="Close">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </Dialog.Close>
        </div>

        <div class="grid gap-6 p-6 lg:grid-cols-2">
          <!-- Printable receipt preview -->
          <div class="rounded-xl border border-dashed border-ink-300 bg-white p-5 font-mono text-[13px] leading-relaxed text-ink-800">
            <div class="mb-3 flex items-start justify-between border-b border-ink-200 pb-3">
              <div>
                <p class="text-sm font-bold uppercase tracking-wider text-ink-900">Payment Receipt</p>
                <p class="text-xs text-ink-500">{payment.domain === 'remedial' ? 'Remedial Fees (M-Pesa)' : 'School Fees (Bank)'}</p>
              </div>
              <p class="text-right text-xs text-ink-500">
                <span class="block font-semibold text-ink-900">#{payment.receipt_no ?? payment.id.slice(0, 8).toUpperCase()}</span>
                {payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-GB') : '—'}
              </p>
            </div>
            <p class="font-semibold text-ink-900">{studentName}</p>
            <p class="text-xs text-ink-500">Adm #: {payment.students?.admission_no ?? '—'}{payment.students?.grade ? ` · Grade: ${payment.students.grade}` : ''}</p>
            <div class="my-3 border-t border-dashed border-ink-200"></div>
            <div class="flex justify-between"><span class="text-ink-500">Description</span><span class="font-semibold text-ink-900">KES {Number(payment.amount ?? 0).toLocaleString()}</span></div>
            <p class="text-xs text-ink-500">{feeName}{payment.domain === 'remedial' ? ' — Remedial fee' : ' — School fee'}</p>
            <div class="my-3 border-t border-dashed border-ink-200"></div>
            <div class="flex justify-between text-sm"><span class="font-semibold">Amount Paid</span><span class="font-semibold">KES {Number(payment.amount ?? 0).toLocaleString()}</span></div>
            <p class="mt-3 text-xs text-ink-500">Paid via <span class="font-semibold text-ink-800">{channel}</span></p>
            <p class="text-xs text-ink-500">Status: <span class="font-semibold uppercase {payment.status === 'paid' ? 'text-success' : 'text-warning'}">{payment.status ?? '—'}</span></p>
            <div class="mt-4 border-t border-ink-200 pt-3 text-[10px] text-ink-400">
              <p>eShule — School Management Platform</p>
              <p>Computer-generated receipt. No signature required.</p>
            </div>
          </div>

          <!-- Edit form -->
          <form method="POST" action="?/edit" use:enhance class="space-y-4">
            <input type="hidden" name="payment_id" value={payment.id} />
            <p class="text-sm font-semibold text-ink-900">Edit receipt</p>
            <p class="text-xs text-ink-500">Changes are audit-logged (who, before, after).</p>

            <div>
              <label for="edit-student" class="mb-1 block text-xs font-medium text-ink-600">Student</label>
              <select id="edit-student" name="student_id"
                class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900">
                {#each students as s}
                  <option value={s.id} selected={s.id === payment.student_id}>{s.first_name} {s.last_name} · {s.admission_no}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="edit-fee" class="mb-1 block text-xs font-medium text-ink-600">Fee (domain decides school vs remedial)</label>
              <select id="edit-fee" name="fee_type_id"
                class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900">
                <option value="">—</option>
                {#each feeTypes as f}
                  <option value={f.id} selected={f.id === payment.fee_type_id}>{f.name} · KES {Number(f.amount).toLocaleString()} · {f.domain === 'school' ? 'School' : 'Remedial'}</option>
                {/each}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-amount" class="mb-1 block text-xs font-medium text-ink-600">Amount (KES)</label>
                <input id="edit-amount" name="amount" type="number" step="0.01" min="0" value={payment.amount}
                  class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900" />
              </div>
              <div>
                <label for="edit-method" class="mb-1 block text-xs font-medium text-ink-600">Method</label>
                <select id="edit-method" name="method"
                  class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900">
                  <option value="mpesa" selected={payment.method === 'mpesa'}>M-Pesa</option>
                  <option value="bank" selected={payment.method === 'bank'}>Bank (KCB)</option>
                </select>
              </div>
            </div>

            <div>
              <label for="edit-status" class="mb-1 block text-xs font-medium text-ink-600">Status</label>
              <select id="edit-status" name="status"
                class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-900">
                {#each ['paid', 'pending', 'failed', 'reversed'] as st}
                  <option value={st} selected={payment.status === st}>{st}</option>
                {/each}
              </select>
            </div>

            <div class="flex gap-2 pt-1">
              <button type="submit"
                class="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
                Save changes
              </button>
              <a href={`/admin/receipts/${payment.id}/print`} target="_blank"
                class="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" /></svg>
                Print / PDF
              </a>
            </div>
          </form>
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
