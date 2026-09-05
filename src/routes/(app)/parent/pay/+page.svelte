<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { CheckCircle2, Clock3, CreditCard, ReceiptText, ShieldCheck, XCircle } from 'lucide-svelte';
  import type { PageData } from './$types';
  import { onDestroy } from 'svelte';

  const { data }: { data: PageData } = $props();
  let selectedStudentId = $state('');
  let selectedFeeTypeId = $state('');
  let loading = $state(false);
  let polling = $state(false);
  let success = $state(false);
  let error = $state<string | null>(null);
  let pollAttempts = $state(0);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const selectedStudent = $derived(data.students.find((s) => s.id === selectedStudentId) ?? null);
  const selectedFee = $derived(data.feeTypes.find((f) => f.id === selectedFeeTypeId) ?? null);
  const selectedDomain = $derived(selectedFee?.domain === 'school' ? 'school' : 'remedial');
  const selectedChannel = $derived(selectedDomain === 'school' ? data.channels.school : data.channels.remedial);
  const feeTypesByDomain = $derived({ school: data.feeTypes.filter((f) => f.domain === 'school'), remedial: data.feeTypes.filter((f) => f.domain === 'remedial') });
  const step = $derived(success ? 4 : polling ? 3 : selectedStudent && selectedFee ? 2 : 1);

  onDestroy(() => { if (pollTimer) clearInterval(pollTimer); });
  function stopPolling() { polling = false; if (pollTimer) clearInterval(pollTimer); pollTimer = null; }
  function startPolling(studentId: string, feeTypeId: string) {
    stopPolling(); polling = true; pollAttempts = 0;
    pollTimer = setInterval(async () => {
      pollAttempts += 1;
      try {
        const res = await fetch(`/parent/pay/status?student_id=${studentId}&fee_type_id=${feeTypeId}`);
        if (res.status === 403) { error = 'This payment is not authorized for the selected student.'; stopPolling(); return; }
        if (!res.ok) throw new Error('status check failed');
        const status = await res.json();
        if (status.status === 'completed') { success = true; stopPolling(); }
        else if (status.status === 'failed') { error = 'M-Pesa did not complete this payment. You can safely try again.'; stopPolling(); }
      } catch { /* transient status failures should not interrupt the payment */ }
      if (pollAttempts >= 20 && !success) { error = 'Confirmation is taking longer than expected. Check your phone and payment history before trying again.'; stopPolling(); }
    }, 3000);
  }
  async function handlePay(e: Event) {
    e.preventDefault();
    if (!selectedStudentId || !selectedFeeTypeId || loading || polling || selectedChannel !== 'mpesa') return;
    error = null; success = false; loading = true;
    try {
      const { error: fnErr } = await getSupabase().functions.invoke('stk', { body: { student_id: selectedStudentId, fee_type_id: selectedFeeTypeId } });
      if (fnErr) throw fnErr;
      loading = false; startPolling(selectedStudentId, selectedFeeTypeId);
    } catch (err) {
      loading = false;
      error = `Payment request could not be started${err instanceof Error && err.message ? ` (${err.message})` : ''}. No payment was recorded. Please try again.`;
    }
  }
  function resetPayment() { stopPolling(); loading = false; success = false; error = null; selectedStudentId = ''; selectedFeeTypeId = ''; }
</script>

<svelte:head><title>Pay fees · eShule</title><meta name="description" content="Secure school and remedial fee payment with M-Pesa confirmation and receipt evidence." /></svelte:head>

<DashboardContent title="Pay fees" subtitle="Complete one payment at a time. We keep the request locked while M-Pesa confirms it.">
  <div class="mx-auto max-w-4xl space-y-6">
    <ol aria-label="Payment progress" class="grid grid-cols-4 gap-2">
      {#each ['Child', 'Payment', 'Confirm', 'Receipt'] as label, i}
        <li class="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold {step > i ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border bg-white text-ink-400'}"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full {step > i ? 'bg-primary text-white' : 'bg-ink-50'}">{i + 1}</span><span class="hidden sm:inline">{label}</span></li>
      {/each}
    </ol>

    {#if success}
      <section class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6" role="status"><div class="flex items-start gap-4"><CheckCircle2 class="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" /><div><h2 class="text-lg font-semibold text-emerald-900">Payment confirmed</h2><p class="mt-1 text-sm text-emerald-800">Your payment has been recorded. A receipt is now the evidence of payment.</p><div class="mt-4 flex flex-wrap gap-2"><a href="/parent/payments" class="ui-action ui-action-primary"><ReceiptText class="h-4 w-4" /> View payment history</a><button type="button" onclick={resetPayment} class="ui-action ui-action-secondary">Make another payment</button></div></div></div></section>
    {:else}
      <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form onsubmit={handlePay} class="ui-card space-y-5 p-5 sm:p-6">
          {#if error}<div class="ui-status ui-status-danger" role="alert"><XCircle class="h-4 w-4 shrink-0" /><span>{error}</span></div>{/if}
          <div><label for="student-id" class="text-sm font-semibold text-ink-800">1. Choose your child</label><select id="student-id" bind:value={selectedStudentId} required disabled={loading || polling} class="ui-control mt-2 w-full"><option value="">Select a student</option>{#each data.students as s}<option value={s.id}>{s.first_name} {s.last_name} · {s.admission_no}</option>{/each}</select></div>
          <div><label for="fee-type" class="text-sm font-semibold text-ink-800">2. Choose what to pay</label><select id="fee-type" bind:value={selectedFeeTypeId} required disabled={loading || polling || !selectedStudentId} class="ui-control mt-2 w-full"><option value="">Select a fee</option><optgroup label="Remedial">{#each feeTypesByDomain.remedial as f}<option value={f.id}>{f.name} · KES {Number(f.amount).toLocaleString()}</option>{/each}</optgroup><optgroup label="School fees">{#each feeTypesByDomain.school as f}<option value={f.id}>{f.name} · KES {Number(f.amount).toLocaleString()}</option>{/each}</optgroup></select></div>
          {#if selectedStudent && selectedFee}<div class="rounded-2xl border border-primary/15 bg-primary/5 p-4"><p class="text-xs font-bold uppercase tracking-[0.12em] text-primary">Payment summary</p><div class="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p>Child <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong></p><p>Admission <strong>{selectedStudent.admission_no}</strong></p><p>Fee <strong>{selectedFee.name}</strong></p><p>Amount <strong>KES {Number(selectedFee.amount).toLocaleString()}</strong></p></div><p class="mt-3 text-xs text-ink-500">Channel: <strong>{selectedChannel === 'mpesa' ? 'M-Pesa STK Push' : 'Bank transfer'}</strong></p></div>{/if}
          {#if selectedChannel === 'mpesa' && selectedStudent && selectedFee}<div class="rounded-2xl border border-border bg-ink-50 p-4"><div class="flex gap-3"><ShieldCheck class="h-5 w-5 shrink-0 text-primary" /><div><p class="text-sm font-semibold text-ink-800">Ready for M-Pesa</p><p class="mt-1 text-xs leading-5 text-ink-500">An STK prompt will be sent to your registered phone. Enter your M-Pesa PIN on your phone only. Your payment request stays locked until we receive confirmation.</p></div></div></div><button type="submit" disabled={loading || polling} class="ui-action ui-action-primary min-h-12 w-full justify-center text-sm">{#if loading}<Clock3 class="h-4 w-4 animate-pulse" /> Sending STK request…{:else if polling}<Clock3 class="h-4 w-4 animate-pulse" /> Waiting for M-Pesa confirmation…{:else}<CreditCard class="h-4 w-4" /> Pay KES {Number(selectedFee.amount).toLocaleString()} via M-Pesa{/if}</button>{:else if selectedChannel === 'bank' && selectedStudent && selectedFee}<div class="rounded-2xl border border-border bg-ink-50 p-4"><p class="text-sm font-semibold text-ink-800">Bank payment</p><p class="mt-2 text-sm text-ink-600">Pay to <strong>{data.tenant?.kcb_bank_name ?? 'KCB'}</strong>, account <strong>{data.tenant?.kcb_account_no ?? '—'}</strong>. Use the student's admission number as reference.</p><p class="mt-3 text-xs text-ink-500">The Bursar confirms bank payments and issues the receipt. Do not submit this payment again while a bank transaction is pending.</p></div>{/if}
        </form>
        <aside class="space-y-4"><div class="ui-card p-5"><h2 class="text-sm font-semibold text-ink-900">What happens next</h2><div class="mt-4 space-y-4 text-sm text-ink-600"><div class="flex gap-3"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">1</span><p>We send the payment request to your registered phone.</p></div><div class="flex gap-3"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">2</span><p>You approve it on your phone with your M-Pesa PIN.</p></div><div class="flex gap-3"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">3</span><p>We wait for confirmation before enabling another payment.</p></div><div class="flex gap-3"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">4</span><p>The confirmed payment appears in history as evidence.</p></div></div></div>{#if polling}<div class="ui-status ui-status-warning"><Clock3 class="h-4 w-4 shrink-0" /><span>Waiting for confirmation. Check your phone for the STK prompt. Do not press Pay again.</span></div>{/if}</aside>
      </div>
    {/if}
  </div>
</DashboardContent>