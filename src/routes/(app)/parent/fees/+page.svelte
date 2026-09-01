<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const fees = $derived(data.fees ?? []);
  const ledger = $derived(data.ledger ?? []);
  const schoolLedger = $derived(ledger.filter((row: any) => row.domain !== 'remedial'));
  const remedialLedger = $derived(ledger.filter((row: any) => row.domain === 'remedial'));
  const balance = (rows: any[]) => rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
  const schoolBalance = $derived(balance(schoolLedger));
  const remedialBalance = $derived(balance(remedialLedger));
</script>

<DashboardContent title="Fees & obligations" subtitle="School fees and ReClass obligations are tracked and paid separately">
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2">
      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="school-fees-title"><p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">School account</p><h2 id="school-fees-title" class="mt-1 text-lg font-bold text-slate-900">School fees</h2><p class="mt-1 text-sm text-slate-500">School charges paid through the school's bank payment route.</p><p class="mt-4 text-2xl font-bold text-slate-950">KES {schoolBalance.toLocaleString()}</p><p class="text-xs text-slate-500">Outstanding</p><a href="/parent/pay?type=school" class="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">Pay school fees →</a></section>
      <section class="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm" aria-labelledby="reclass-fees-title"><p class="text-xs font-bold uppercase tracking-[0.12em] text-primary">Programme account</p><h2 id="reclass-fees-title" class="mt-1 text-lg font-bold text-slate-900">ReClass obligations</h2><p class="mt-1 text-sm text-slate-500">Remedial programme charges paid through M-Pesa.</p><p class="mt-4 text-2xl font-bold text-slate-950">KES {remedialBalance.toLocaleString()}</p><p class="text-xs text-slate-500">Outstanding</p><a href="/parent/pay?type=remedial" class="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30">Pay ReClass →</a></section>
    </div>

    <section aria-labelledby="obligations-title" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><h2 id="obligations-title" class="text-base font-bold text-slate-900">ReClass obligations</h2><p class="mt-1 text-sm text-slate-500">Only remedial programme obligations are shown here.</p></div><DataTable data={remedialLedger} columns={[{key:'first_name',label:'Child',render:(s:any)=>`${s.first_name} ${s.last_name} (${s.admission_no ?? ''})`},{key:'grade',label:'Class'},{key:'obligation',label:'Charged',render:(s:any)=>`KES ${Number(s.obligation ?? 0).toLocaleString()}`},{key:'paid',label:'Paid',render:(s:any)=>`KES ${Number(s.paid ?? 0).toLocaleString()}`},{key:'balance',label:'Balance',render:(s:any)=>`KES ${Number(s.balance ?? 0).toLocaleString()}`}]} emptyMessage="No ReClass obligations" /></section>

    <section aria-labelledby="school-structure-title"><div class="mb-4"><h2 id="school-structure-title" class="text-base font-bold text-slate-900">School fee structure</h2><p class="mt-1 text-sm text-slate-500">These are school charges, separate from ReClass obligations.</p></div><DataTable data={fees} columns={[{key:'name',label:'Fee',sortable:true},{key:'amount',label:'Amount',render:(f:any)=>`KES ${Number(f.amount).toLocaleString()}`},{key:'due_date',label:'Due',render:(f:any)=>f.due_date ? new Date(f.due_date).toLocaleDateString() : '—'},{key:'term',label:'Term'}]} emptyMessage="No school fee records" /></section>
  </div>
</DashboardContent>
