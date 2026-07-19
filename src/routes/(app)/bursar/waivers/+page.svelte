<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import { enhance } from '$app/forms';

  const { data, form } = $props();
  const waivers = $derived(data.waivers ?? []);
  const invoices = $derived(data.invoices ?? []);

  let creating = $state(false);
  let selectedInvoice = $state<any>(null);
  let waiverAmount = $state(0);
  let waiverReason = $state('');

  function openWaiverForm(inv: any) {
    selectedInvoice = inv;
    waiverAmount = Number(inv.amount_due) - Number(inv.amount_paid);
    waiverReason = '';
    creating = true;
  }

  function closeForm() {
    creating = false;
    selectedInvoice = null;
  }
</script>

<DashboardContent title="Fee waivers" subtitle="Approve waivers alongside M-Pesa reconciliation">
  {#if form?.success}
    <div class="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
      Waiver of KES {Number(form.amount).toLocaleString()} granted: {form.reason}
    </div>
  {/if}
  {#if form?.error}
    <div class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  <h3 class="mb-3 text-sm font-semibold text-ink-900">Issued Waivers</h3>
  <DataTable
    data={waivers}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Admission No' },
      { key: 'amount', label: 'Amount (KES)', render: (w: any) => `KES ${Number(w.amount).toLocaleString()}`, sortable: true },
      { key: 'reason', label: 'Reason' },
      { key: 'created_at', label: 'Date', render: (w: any) => w.created_at?.split('T')[0] ?? '—', sortable: true },
    ]}
    emptyMessage="No waivers issued yet"
  />

  <h3 class="mb-3 mt-8 text-sm font-semibold text-ink-900">Outstanding Invoices</h3>
  <DataTable
    data={invoices}
    columns={[
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'admission_no', label: 'Admission No' },
      { key: 'amount_due', label: 'Amount Due', render: (i: any) => `KES ${Number(i.amount_due).toLocaleString()}`, sortable: true },
      { key: 'amount_paid', label: 'Amount Paid', render: (i: any) => `KES ${Number(i.amount_paid).toLocaleString()}`, sortable: true },
      {
        key: 'outstanding',
        label: 'Outstanding',
        render: (i: any) => `KES ${(Number(i.amount_due) - Number(i.amount_paid)).toLocaleString()}`,
        sortable: true,
      },
      { key: 'status', label: 'Status', sortable: true },
    ]}
    onEdit={(inv) => {
      const o = Number(inv.amount_due) - Number(inv.amount_paid);
      if (o > 0) openWaiverForm(inv);
    }}
    editLabel={(inv: any) => {
      const o = Number(inv.amount_due) - Number(inv.amount_paid);
      return o > 0 ? 'Waive' : '';
    }}
    emptyMessage="No outstanding invoices"
  />
</DashboardContent>

{#if creating && selectedInvoice}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" onclick={closeForm} onkeydown={(e) => e.key === 'Escape' && closeForm()}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="w-full max-w-md rounded-2xl border border-border bg-white shadow-xl" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <form method="POST" action="?/create" use:enhance>
        <input type="hidden" name="invoice_id" value={selectedInvoice.id} />
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-sm font-semibold text-ink-900">Create Waiver</h3>
          <p class="mt-1 text-xs text-ink-500">
            {selectedInvoice.student_name} — {selectedInvoice.admission_no}
          </p>
        </div>
        <div class="space-y-4 px-6 py-4">
          <div>
            <label for="amount" class="mb-1.5 block text-sm font-medium text-ink-700">
              Amount (max KES {((Number(selectedInvoice.amount_due) - Number(selectedInvoice.amount_paid))).toLocaleString()})
            </label>
            <input
              id="amount" name="amount" type="number" step="0.01" min="0.01"
              max={Number(selectedInvoice.amount_due) - Number(selectedInvoice.amount_paid)}
              bind:value={waiverAmount} required
              class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label for="reason" class="mb-1.5 block text-sm font-medium text-ink-700">Reason</label>
            <textarea
              id="reason" name="reason" bind:value={waiverReason} required rows="3"
              class="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="e.g. Hardship, over-billed, duplicate charge…"
            ></textarea>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button type="button" onclick={closeForm} class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
          <Button type="submit" variant="primary">Grant Waiver</Button>
        </div>
      </form>
    </div>
  </div>
{/if}
