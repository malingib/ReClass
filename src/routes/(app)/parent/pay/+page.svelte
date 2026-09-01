<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import { onDestroy } from 'svelte';
  import type { PageData } from './$types';

  const { data }: { data: PageData } = $props();
  const initialType = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('type') === 'remedial' ? 'remedial' : 'school';
  let selectedStudentId = $state('');
  let selectedFeeTypeId = $state('');
  let selectedType = $state<'school' | 'remedial'>(initialType);
  let loading = $state(false);
  let polling = $state(false);
  let success = $state<string | null>(null);
  let error = $state<string | null>(null);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const selectedStudent = $derived(data.students.find((s) => s.id === selectedStudentId) ?? null);
  const feeTypes = $derived(data.feeTypes.filter((f) => f.domain === selectedType));
  const selectedFee = $derived(feeTypes.find((f) => f.id === selectedFeeTypeId) ?? null);
  const selectedChannel = $derived(selectedType === 'school' ? data.channels.school : data.channels.remedial);
  const ready = $derived(!!selectedStudent && !!selectedFee);

  function chooseType(type: 'school' | 'remedial') { selectedType = type; selectedFeeTypeId = ''; error = null; }
  function reset() { selectedStudentId = ''; selectedFeeTypeId = ''; success = null; error = null; }
  onDestroy(() => { if (pollTimer) clearInterval(pollTimer); });

  function startPolling(studentId: string, feeTypeId: string) {
    polling = true; let attempts = 0; if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/parent/pay/status?student_id=${studentId}&fee_type_id=${feeTypeId}`);
        if (res.status === 403) { error = 'You are not authorized for this student.'; polling = false; if (pollTimer) clearInterval(pollTimer); return; }
        if (!res.ok) throw new Error('status check failed');
        const status = await res.json();
        if (status.status === 'completed') { success = 'ReClass payment confirmed. Your receipt has been generated.'; polling = false; if (pollTimer) clearInterval(pollTimer); }
        else if (status.status === 'failed') { error = 'Payment failed. Please try again.'; polling = false; if (pollTimer) clearInterval(pollTimer); }
      } catch { /* transient polling errors */ }
      if (attempts >= 20 && polling) { polling = false; if (pollTimer) clearInterval(pollTimer); error = 'We are still waiting for confirmation. Check your phone and payment history shortly.'; }
    }, 3000);
  }

  async function handlePay(e: Event) {
    e.preventDefault(); if (!selectedStudentId || !selectedFeeTypeId || loading || polling || selectedChannel !== 'mpesa') return;
    error = null; success = null; loading = true;
    try {
      const { error: fnErr } = await getSupabase().functions.invoke('stk', { body: { student_id: selectedStudentId, fee_type_id: selectedFeeTypeId } });
      if (fnErr) throw fnErr;
      loading = false; startPolling(selectedStudentId, selectedFeeTypeId);
    } catch (err) { loading = false; error = `Payment request failed${err instanceof Error && err.message ? ` (${err.message})` : ''}. Please try again.`; }
  }
</script>

<DashboardContent title="Pay Now" subtitle="Choose the account you want to settle. School fees and ReClass use separate payment routes.">
  <div class="mx-auto max-w-4xl space-y-6">
    <section aria-labelledby="account-heading" class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="account-heading" class="text-base font-bold text-slate-900">Choose payment account</h2>
      <p class="mt-1 text-sm text-slate-500">Your payment is posted only to the account you select.</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2" role="group" aria-label="Payment account">
        <button type="button" aria-pressed={selectedType === 'school'} onclick={() => chooseType('school')} class="rounded-xl border p-4 text-left focus:outline-none focus:ring-2 focus:ring-primary/30 {selectedType === 'school' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}"><span class="block text-sm font-bold text-slate-900">School fees</span><span class="mt-1 block text-xs text-slate-500">Tuition and school charges · Bank payment</span></button>
        <button type="button" aria-pressed={selectedType === 'remedial'} onclick={() => chooseType('remedial')} class="rounded-xl border p-4 text-left focus:outline-none focus:ring-2 focus:ring-primary/30 {selectedType === 'remedial' ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'}"><span class="block text-sm font-bold text-slate-900">ReClass</span><span class="mt-1 block text-xs text-slate-500">Remedial programme obligations · M-Pesa</span></button>
      </div>
    </section>

    <ol aria-label="Payment steps" class="grid grid-cols-3 gap-2 text-center text-xs font-semibold"><li class="rounded-lg bg-primary px-2 py-2 text-primary-foreground">1 · Choose</li><li class="rounded-lg {ready ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-500'} px-2 py-2">2 · Review</li><li class="rounded-lg {polling || success ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-500'} px-2 py-2">3 · Confirm</li></ol>

    {#if success}<div role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success} <button type="button" onclick={reset} class="ml-2 underline">Make another payment</button></div>{/if}
    {#if error}<div role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>{/if}

    <form onsubmit={handlePay} class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section aria-labelledby="details-heading" class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="details-heading" class="text-base font-bold text-slate-900">{selectedType === 'school' ? 'School fee details' : 'ReClass obligation details'}</h2>
        <div class="mt-5 space-y-5">
          <div><label for="student-id" class="text-sm font-semibold text-slate-700">Child</label><select id="student-id" bind:value={selectedStudentId} required disabled={loading || polling} class="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"><option value="">Select a child</option>{#each data.students as s}<option value={s.id}>{s.first_name} {s.last_name} · {s.admission_no}</option>{/each}</select></div>
          <div><label for="fee-type" class="text-sm font-semibold text-slate-700">{selectedType === 'school' ? 'School fee' : 'ReClass obligation'}</label><select id="fee-type" bind:value={selectedFeeTypeId} required disabled={loading || polling || !selectedStudentId} class="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"><option value="">Select {selectedType === 'school' ? 'a school fee' : 'a ReClass obligation'}</option>{#each feeTypes as f}<option value={f.id}>{f.name} · KES {Number(f.amount).toLocaleString()}</option>{/each}</select></div>
        </div>
      </section>

      <aside aria-labelledby="summary-heading" class="rounded-2xl border border-slate-200/70 bg-slate-50 p-5 shadow-sm sm:p-6">
        <h2 id="summary-heading" class="text-base font-bold text-slate-900">Review & pay</h2>
        {#if selectedStudent && selectedFee}
          <dl class="mt-4 space-y-3 text-sm"><div class="flex justify-between gap-4"><dt class="text-slate-500">Account</dt><dd class="font-bold text-slate-900">{selectedType === 'school' ? 'School fees' : 'ReClass'}</dd></div><div class="flex justify-between gap-4"><dt class="text-slate-500">Child</dt><dd class="text-right font-semibold text-slate-900">{selectedStudent.first_name} {selectedStudent.last_name}</dd></div><div class="flex justify-between gap-4"><dt class="text-slate-500">Obligation</dt><dd class="text-right font-semibold text-slate-900">{selectedFee.name}</dd></div><div class="border-t border-slate-200 pt-3 flex justify-between gap-4"><dt class="font-semibold text-slate-600">Amount</dt><dd class="text-lg font-bold text-slate-950">KES {Number(selectedFee.amount).toLocaleString()}</dd></div></dl>
          {#if selectedType === 'remedial'}<div class="mt-4 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">ReClass payments are made via M-Pesa. A secure STK prompt will be sent to <strong>{data.parent.phone}</strong>. The student's admission number identifies the ReClass payment.</div><button type="submit" disabled={loading || polling} class="mt-4 min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50">{loading ? 'Sending M-Pesa request…' : polling ? 'Waiting for confirmation…' : 'Pay ReClass via M-Pesa'}</button>{#if polling}<p role="status" class="mt-3 text-center text-xs text-slate-500">Waiting for M-Pesa confirmation. Keep this page open.</p>{/if}
          {:else}<div class="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm"><p class="font-semibold text-slate-900">School bank payment</p><p class="mt-2 text-slate-600">{data.tenant?.kcb_bank_name ?? 'KCB'} · Account <strong>{data.tenant?.kcb_account_no ?? '—'}</strong>{#if data.tenant?.buni_shortcode}<br />Buni pay: <strong>{data.tenant.buni_shortcode}</strong>{/if}</p><p class="mt-2 text-xs text-slate-500">Use the student's admission number as the payment reference. The school will confirm the deposit.</p></div><p class="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">School fees are not sent through the ReClass M-Pesa flow.</p>{/if}
        {:else}<div class="flex min-h-48 flex-col items-center justify-center text-center"><p class="text-sm font-semibold text-slate-700">Choose a child and {selectedType === 'school' ? 'school fee' : 'ReClass obligation'}</p><p class="mt-1 max-w-xs text-xs text-slate-500">The correct payment route and amount will appear here.</p></div>{/if}
      </aside>
    </form>

    <p class="text-center text-xs text-slate-500">School fees and ReClass payments are recorded separately. Never share your M-Pesa PIN with anyone.</p>
  </div>
</DashboardContent>
