<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  const { data } = $props();
  const receipts = $derived(data.receipts ?? []);
  function printReceipt(id: string) { window.open(`/receipts/${id}/print`, '_blank', 'noopener,noreferrer'); }
</script>

<svelte:head><title>Payment Receipts | eShule</title></svelte:head>
<DashboardContent title="Payment Receipts" subtitle="One receipt per successful payment. Payroll remains a separate weekly control sheet.">
  <section class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><h2 class="font-bold text-slate-900">Receipts</h2><p class="mt-1 text-sm text-slate-500">Print an individual receipt for a student, teacher or other payment.</p></div><DataTable data={receipts} columns={[{key:'receipt_number',label:'Receipt No.',sortable:true},{key:'paid_at',label:'Date',render:(r:any)=>r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—'},{key:'payment_domain',label:'Type'},{key:'amount',label:'Amount',render:(r:any)=>`${r.currency ?? 'KES'} ${Number(r.amount).toLocaleString()}`},{key:'payment_reference',label:'Reference',render:(r:any)=>r.payment_reference ?? '—'},{key:'confirmation_status',label:'Confirmation'},{key:'id',label:'',render:(r:any)=>`Print receipt` ,onClick:(r:any)=>printReceipt(r.id)}]} emptyMessage="No payment receipts yet" /></section>
</DashboardContent>
