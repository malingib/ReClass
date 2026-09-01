<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const students = $derived(data.students ?? []);
  const payments = $derived(data.payments ?? []);
  const ledger = $derived(data.ledger ?? []);
  const announcements = $derived(data.announcements ?? []);
  const totalBalance = $derived(ledger.reduce((sum: number, row: any) => sum + Number(row.balance ?? 0), 0));
</script>

<DashboardContent title="Parent home" subtitle="Your children, school updates and payments">
  {#snippet headerActions()}
    <a href="/parent/pay" class="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30">Pay now</a>
  {/snippet}

  <div class="space-y-6">
    <section aria-labelledby="pay-heading" class="rounded-2xl border border-primary/15 bg-primary/5 p-5 shadow-sm sm:p-6">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Payment at a glance</p><h2 id="pay-heading" class="mt-1 text-2xl font-bold text-slate-950">{totalBalance > 0 ? `KES ${totalBalance.toLocaleString()} outstanding` : 'No outstanding balance'}</h2><p class="mt-1 text-sm text-slate-600">Pay school or programme fees securely from one place.</p></div><div class="flex flex-wrap gap-2"><a href="/parent/pay" class="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30">Pay now <span aria-hidden="true" class="ml-1">→</span></a><a href="/parent/fees" class="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">View fees</a></div></div>
    </section>

    <section aria-labelledby="children-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><h2 id="children-heading" class="text-base font-bold text-slate-900">My children</h2><p class="mt-1 text-sm text-slate-500">Linked students and their current school records.</p></div>{#if students.length === 0}<div class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700">No children linked yet</p><p class="mt-1 text-xs text-slate-500">Contact the school office to link your parent account.</p></div>{:else}<DataTable data={students} columns={[{key:'admission_no',label:'Admission No',sortable:true},{key:'first_name',label:'Name',render:(s:any)=>`${s.first_name} ${s.last_name}`},{key:'grade',label:'Class'},{key:'status',label:'Status'}]} emptyMessage="No children linked" />{/if}</section>

    {#if ledger.length > 0}
      <section aria-labelledby="balance-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 id="balance-heading" class="text-base font-bold text-slate-900">Fees balance</h2><p class="mt-1 text-sm text-slate-500">School and programme fees across your children.</p></div><a href="/parent/pay" class="text-sm font-bold text-primary hover:underline">Pay now <span aria-hidden="true">→</span></a></div><DataTable data={ledger} columns={[{key:'first_name',label:'Child',render:(s:any)=>`${s.first_name} ${s.last_name}`},{key:'grade',label:'Class'},{key:'obligation',label:'Total',render:(s:any)=>`KES ${Number(s.obligation).toLocaleString()}`},{key:'paid',label:'Paid',render:(s:any)=>`KES ${Number(s.paid).toLocaleString()}`},{key:'balance',label:'Balance',render:(s:any)=>`KES ${Number(s.balance).toLocaleString()}`}]} emptyMessage="No fee balances" /></section>
    {/if}

    <div class="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="payments-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="payments-heading" class="text-base font-bold text-slate-900">Recent payments</h2><a href="/parent/payments" class="text-sm font-semibold text-primary hover:underline">View all</a></div><DataTable data={payments.slice(0,5)} columns={[{key:'created_at',label:'Date',render:(p:any)=>p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'},{key:'fee_type',label:'Fee'},{key:'amount',label:'Amount',render:(p:any)=>`KES ${Number(p.amount).toLocaleString()}`},{key:'domain',label:'Type',render:(p:any)=>p.domain === 'remedial' ? 'Programme' : 'School'}]} emptyMessage="No payments yet" /></section>

      <section aria-labelledby="updates-heading"><div class="flex items-center justify-between"><h2 id="updates-heading" class="text-base font-bold text-slate-900">School updates</h2><a href="/notifications" class="text-sm font-semibold text-primary hover:underline">View all</a></div><div class="mt-3 space-y-3">{#if announcements.length === 0}<div class="rounded-xl border border-slate-200/70 bg-white p-5 text-sm text-slate-500">No new school updates.</div>{:else}{#each announcements.slice(0,3) as a}<article class="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm"><div class="flex items-center gap-2"><h3 class="text-sm font-semibold text-slate-900">{a.title}</h3>{#if a.priority === 'urgent'}<span class="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Urgent</span>{/if}</div><p class="mt-2 line-clamp-2 text-sm text-slate-600">{a.body}</p></article>{/each}{/if}</div></section>
    </div>
  </div>
</DashboardContent>
