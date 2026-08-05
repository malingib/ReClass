<script lang="ts">
  import { getSupabase } from '$lib/supabase/client';
  import DashboardContent from '$lib/components/DashboardContent.svelte';

  const { data } = $props();

  let selectedStudentId = $state('');
  let selectedFeeTypeId = $state('');
  let loading = $state(false);
  let polling = $state(false);
  let success = $state<string | null>(null);
  let error = $state<string | null>(null);

  const selectedStudent = $derived(
    data.students.find((s: any) => s.id === selectedStudentId) ?? null
  );
  const selectedFee = $derived(
    data.feeTypes.find((f: any) => f.id === selectedFeeTypeId) ?? null
  );
  // Channel for the SELECTED fee's domain (one per domain, set by the school).
  const selectedDomain = $derived(selectedFee?.domain === 'school' ? 'school' : 'remedial');
  const selectedChannel = $derived(
    selectedDomain === 'school' ? data.channels.school : data.channels.remedial
  );
  const feeTypesByDomain = $derived({
    school: data.feeTypes.filter((f: any) => f.domain === 'school'),
    remedial: data.feeTypes.filter((f: any) => f.domain === 'remedial'),
  });

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function startPolling(studentId: string, feeTypeId: string) {
    polling = true;
    let attempts = 0;
    pollTimer = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/parent/pay/status?student_id=${studentId}&fee_type_id=${feeTypeId}`);
        const status = await res.json();
        if (status.status === 'completed') {
          success = 'Payment confirmed! A receipt has been generated.';
          polling = false;
          if (pollTimer) clearInterval(pollTimer);
          selectedStudentId = '';
          selectedFeeTypeId = '';
        } else if (status.status === 'failed') {
          error = 'Payment failed. Please try again or contact the school.';
          polling = false;
          if (pollTimer) clearInterval(pollTimer);
        }
      } catch {
        // ignore poll errors
      }
      if (attempts > 20) {
        polling = false;
        if (pollTimer) clearInterval(pollTimer);
        if (!success) {
          error = 'Still waiting for confirmation. Check your phone for the M-Pesa prompt.';
        }
      }
    }, 3000);
  }

  async function handlePay(e: Event) {
    e.preventDefault();
    if (!selectedStudentId || !selectedFeeTypeId) return;
    error = null;
    success = null;
    loading = true;

    try {
      const { error: fnErr } = await getSupabase().functions.invoke('stk', {
        body: { student_id: selectedStudentId, fee_type_id: selectedFeeTypeId },
      });
      if (fnErr) throw fnErr;
      loading = false;
      startPolling(selectedStudentId, selectedFeeTypeId);
    } catch {
      loading = false;
      error = 'Payment request failed. Please try again or contact the school.';
    }
  }
</script>

<DashboardContent title="Pay fees" subtitle="Pay school fees and remedials for your children via the school's payment channels">
  <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
    <form onsubmit={handlePay} class="space-y-4 rounded-xl border border-border bg-white p-6 shadow-card">
      {#if success}
        <div class="rounded-md bg-success/10 p-3 text-sm text-success">{success}</div>
      {/if}
      {#if error}
        <div class="rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</div>
      {/if}

      <div>
        <label for="student-id" class="text-sm font-medium text-ink-700">Student</label>
        <select id="student-id" name="student_id" bind:value={selectedStudentId} required disabled={loading || polling}
          class="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:opacity-50">
          <option value="">Select a student</option>
          {#each data.students as s}
            <option value={s.id}>{s.first_name} {s.last_name} · {s.admission_no}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="fee-type" class="text-sm font-medium text-ink-700">Fee</label>
        <select id="fee-type" name="fee_type_id" bind:value={selectedFeeTypeId} required disabled={loading || polling || !selectedStudentId}
          class="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:opacity-50">
          <option value="">Select a fee</option>
          <optgroup label="Remedial">
            {#each feeTypesByDomain.remedial as f}
              <option value={f.id}>{f.name} · KES {Number(f.amount).toLocaleString()}</option>
            {/each}
          </optgroup>
          <optgroup label="School fees">
            {#each feeTypesByDomain.school as f}
              <option value={f.id}>{f.name} · KES {Number(f.amount).toLocaleString()}</option>
            {/each}
          </optgroup>
        </select>
      </div>

      {#if selectedStudent && selectedFee}
        <div class="rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-3 space-y-1.5">
          <p class="text-sm font-semibold text-ink-900">Payment Summary</p>
          <p class="text-sm text-ink-600">Student: <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong> ({selectedStudent.admission_no})</p>
          <p class="text-sm text-ink-600">Fee: <strong>{selectedFee.name}</strong> ({selectedDomain === 'school' ? 'School' : 'Remedial'})</p>
          <p class="text-sm text-ink-600">Amount: <strong>KES {Number(selectedFee.amount).toLocaleString()}</strong></p>
          <p class="text-sm text-ink-600">Channel: <strong>{selectedChannel === 'mpesa' ? 'M-Pesa paybill' : 'Bank transfer (KCB)'}</strong></p>
        </div>
      {/if}

      {#if selectedChannel === 'mpesa' && selectedStudent && selectedFee}
        <div class="rounded-md bg-ink-50 p-3 text-xs text-ink-600">
          An M-Pesa STK push will be sent to <strong>{data.parent.phone}</strong>. Enter your PIN when prompted.
          The account reference is the student's admission number (<strong>{selectedStudent.admission_no}</strong>).
        </div>
        <button type="submit" disabled={!selectedStudentId || !selectedFeeTypeId || loading || polling}
          class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">
          {#if loading}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Sending STK push…
          {:else if polling}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Waiting for confirmation…
          {:else}
            Pay via M-Pesa
          {/if}
        </button>
        {#if polling}
          <div class="rounded-md bg-warning/10 p-3 text-xs text-warning">
            Waiting for M-Pesa confirmation. Check your phone for the STK prompt and enter your PIN.
          </div>
        {/if}
      {:else if selectedChannel === 'bank' && selectedStudent && selectedFee}
        <div class="rounded-lg border border-border bg-ink-50/60 px-4 py-4">
          <p class="text-sm font-semibold text-ink-900">Pay by bank transfer</p>
          <p class="mt-2 text-sm text-ink-600">
            This fee is collected via bank transfer. Deposit the amount to:
          </p>
          <div class="mt-3 space-y-1.5 text-sm">
            <p class="text-ink-800"><strong>{data.tenant?.kcb_bank_name ?? 'KCB'}</strong></p>
            <p class="text-ink-800">Account: <strong>{data.tenant?.kcb_account_no ?? '—'}</strong></p>
            {#if data.tenant?.buni_shortcode}
              <p class="text-ink-800">Buni pay: <strong>{data.tenant.buni_shortcode}</strong></p>
            {/if}
            <p class="text-ink-800">Student: <strong>{selectedStudent.first_name} {selectedStudent.last_name} · {selectedStudent.admission_no}</strong></p>
          </div>
          <p class="mt-3 text-xs text-ink-500">
            After depositing, the school will confirm the payment and generate a receipt. You can also pay
            at the bank using the student's admission number as the payment reference.
          </p>
        </div>
        <button type="button" disabled
          class="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-ink-200 px-4 py-2.5 text-sm font-medium text-ink-500">
          Bank channel — pay at the bank
        </button>
      {/if}

      <p class="text-xs text-ink-500">Funds settle at the school's payment accounts. Confirmation arrives by SMS via Mobiwave.</p>
    </form>

    <div class="space-y-3 rounded-xl border border-brand-200 bg-brand-50/60 p-6 shadow-card">
      <h3 class="text-sm font-semibold text-ink-900">How payment works</h3>
      <ol class="space-y-3 text-sm text-ink-600">
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">1</span> Select your child and the fee you want to pay — school fees or remedials.</li>
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">2</span> The school's channel for that fee type decides how you pay: M-Pesa STK push or bank transfer.</li>
        <li class="flex gap-3"><span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">3</span> The payment is routed to the correct student by admission number and a receipt is generated.</li>
      </ol>
    </div>
  </div>
</DashboardContent>
