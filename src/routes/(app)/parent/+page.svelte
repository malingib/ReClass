<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const students = $derived(data.students ?? []);
  const payments = $derived(data.payments ?? []);
  const ledger = $derived(data.ledger ?? []);
  const announcements = $derived(data.announcements ?? []);
  const schoolLedger = $derived(ledger.filter((row: any) => row.domain !== 'remedial'));
  const remedialLedger = $derived(ledger.filter((row: any) => row.domain === 'remedial'));
  const balance = (rows: any[]) => rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
  const schoolBalance = $derived(balance(schoolLedger));
  const remedialBalance = $derived(balance(remedialLedger));
  const totalBalance = $derived(schoolBalance + remedialBalance);
</script>

<DashboardContent title="Parent home" subtitle="Your children, school fees, ReClass obligations and school updates">
  {#snippet headerActions()}
    <a href="/parent/pay" class="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30">Pay now</a>
  {/snippet}

  <div class="space-y-6">
    <section aria-labelledby="pay-heading" class="rounded-2xl border border-primary/15 bg-primary/5 p-5 shadow-sm sm:p-6">
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Payment at a glance</p>
      <h2 id="pay-heading" class="mt-1 text-2xl font-bold text-slate-950">{totalBalance > 0 ? `KES ${totalBalance.toLocaleString()} outstanding` : 'No outstanding balance'}</h2>
      <p class="mt-1 text-sm text-slate-600">School fees and ReClass obligations are tracked separately, with different payment routes.</p>
      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <article class="rounded-xl border border-slate-200 bg-white p-4"><div class="flex items-start justify-between gap-3"><div><h3 class="font-bold text-slate-900">School fees</h3><p class="mt-1 text-xs text-slate-500">Tuition and other school charges · Bank payment</p></div><span class="text-lg font-bold text-slate-900">KES {schoolBalance.toLocaleString()}</span></div><a href="/parent/pay?type=school" class="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">Pay school fees →</a></article>
        <article class="rounded-xl border border-primary/20 bg-primary/5 p-4"><div class="flex items-start justify-between gap-3"><div><h3 class="font-bold text-slate-900">ReClass obligations</h3><p class="mt-1 text-xs text-slate-500">Remedial programme charges · M-Pesa</p></div><span class="text-lg font-bold text-slate-900">KES {remedialBalance.toLocaleString()}</span></div><a href="/parent/pay?type=remedial" class="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30">Pay ReClass →</a></article>
      </div>
    </section>

    <section aria-labelledby="children-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><h2 id="children-heading" class="text-base font-bold text-slate-900">My children</h2><p class="mt-1 text-sm text-slate-500">Linked students and their current school records.</p></div>{#if students.length === 0}<div class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700">No children linked yet</p><p class="mt-1 text-xs text-slate-500">Contact the school office to link your parent account.</p></div>{:else}<DataTable data={students} columns={[{key:'admission_no',label:'Admission No',sortable:true},{key:'first_name',label:'Name',render:(s:any)=>`${s.first_name} ${s.last_name}`},{key:'grade',label:'Class'},{key:'status',label:'Status'}]} emptyMessage="No children linked" />{/if}</section>

    <section aria-labelledby="balance-heading" class="rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="border-b border-slate-100 px-5 py-4"><h2 id="balance-heading" class="text-base font-bold text-slate-900">Obligations by child</h2><p class="mt-1 text-sm text-slate-500">Each child's school and ReClass balances remain distinct.</p></div><div class="grid gap-4 p-5 sm:grid-cols-2">{#if ledger.length === 0}<div class="sm:col-span-2 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No fee obligations yet.</div>{:else}{#each students as student}<article class="rounded-xl border border-slate-200 p-4"><h3 class="font-bold text-slate-900">{student.first_name} {student.last_name}</h3><p class="text-xs text-slate-500">{student.admission_no ?? ''} · {student.grade ?? ''}</p><div class="mt-4 space-y-3"><div class="flex items-center justify-between rounded-lg bg-slate-50 p-3"><span><span class="block text-sm font-semibold text-slate-800">School fees</span><span class="text-xs text-slate-500">Bank</span></span><span class="font-bold text-slate-900">KES {Number(schoolLedger.find((r:any) => r.student_id === student.id || r.admission_no === student.admission_no)?.balance ?? 0).toLocaleString()}</span></div><div class="flex items-center justify-between rounded-lg bg-primary/5 p-3"><span><span class="block text-sm font-semibold text-slate-800">ReClass</span><span class="text-xs text-slate-500">M-Pesa</span></span><span class="font-bold text-slate-900">KES {Number(remedialLedger.find((r:any) => r.student_id === student.id || r.admission_no === student.admission_no)?.balance ?? 0).toLocaleString()}</span></div></div></article>{/each}{/if}</div></section>

    <div class="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="payments-heading" class="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"><div class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="payments-heading" class="text-base font-bold text-slate-900">Recent payments</h2><a href="/parent/payments" class="text-sm font-semibold text-primary hover:underline">View all</a></div><DataTable data={payments.slice(0,5)} columns={[{key:'created_at',label:'Date',render:(p:any)=>p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'},{key:'fee_type',label:'Fee'},{key:'amount',label:'Amount',render:(p:any)=>`KES ${Number(p.amount).toLocaleString()}`},{key:'domain',label:'Type',render:(p:any)=>p.domain === 'remedial' ? 'ReClass · M-Pesa' : 'School · Bank'}]} emptyMessage="No payments yet" /></section>
      <section aria-labelledby="updates-heading"><div class="flex items-center justify-between"><h2 id="updates-heading" class="text-base font-bold text-slate-900">School updates</h2><a href="/notifications" class="text-sm font-semibold text-primary hover:underline">View all</a></div><div class="mt-3 space-y-3">{#if announcements.length === 0}<div class="rounded-xl border border-slate-200/70 bg-white p-5 text-sm text-slate-500">No new school updates.</div>{:else}{#each announcements.slice(0,3) as a}<article class="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm"><div class="flex items-center gap-2"><h3 class="text-sm font-semibold text-slate-900">{a.title}</h3>{#if a.priority === 'urgent'}<span class="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Urgent</span>{/if}</div><p class="mt-2 line-clamp-2 text-sm text-slate-600">{a.body}</p></article>{/each}{/if}</div></section>
    </div>
  </div>
</DashboardContent>
