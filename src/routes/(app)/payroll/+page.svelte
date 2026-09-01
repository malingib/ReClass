<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  const { data } = $props();
  const payroll = $derived(data.payroll ?? []);
  const total = $derived(payroll.reduce((sum: number, row: any) => sum + Number(row.net_amount ?? row.amount ?? 0), 0));
</script>

<svelte:head><title>Payroll | eShule</title></svelte:head>
<DashboardContent title="Weekly Payroll" subtitle="Prepare, review and print the consolidated teacher payroll sheet.">
  {#snippet headerActions()}<button type="button" onclick={() => window.print()} class="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Print weekly sheet</button>{/snippet}
  <div class="space-y-5 print:space-y-2">
    <section class="grid gap-3 sm:grid-cols-3"><div class="rounded-xl border border-slate-200 bg-white p-4"><p class="text-xs text-slate-500">Payroll period</p><p class="mt-1 font-bold text-slate-900">{data.periodLabel ?? 'Current week'}</p></div><div class="rounded-xl border border-slate-200 bg-white p-4"><p class="text-xs text-slate-500">Teachers</p><p class="mt-1 text-xl font-bold text-slate-900">{payroll.length}</p></div><div class="rounded-xl border border-slate-200 bg-white p-4"><p class="text-xs text-slate-500">Net payroll</p><p class="mt-1 text-xl font-bold text-slate-900">KES {total.toLocaleString()}</p></div></section>
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><h2 class="font-bold text-slate-900">Weekly payroll sheet</h2><p class="mt-1 text-sm text-slate-500">Payroll approval and payment status are shown separately from individual receipts.</p></div><DataTable data={payroll} columns={[{key:'teacher_name',label:'Teacher',sortable:true},{key:'gross_amount',label:'Gross',render:(r:any)=>`KES ${Number(r.gross_amount ?? 0).toLocaleString()}`},{key:'deductions',label:'Deductions',render:(r:any)=>`KES ${Number(r.deductions ?? 0).toLocaleString()}`},{key:'net_amount',label:'Net pay',render:(r:any)=>`KES ${Number(r.net_amount ?? r.amount ?? 0).toLocaleString()}`},{key:'status',label:'Status'},{key:'receipt_number',label:'Receipt',render:(r:any)=>r.receipt_number ?? 'Generated after payment'}]} emptyMessage="No payroll records for this period" /></section>
    <p class="text-xs text-slate-500">Payroll is the consolidated weekly control sheet. Individual successful payments generate separate teacher receipts.</p>
  </div>
</DashboardContent>
