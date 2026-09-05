<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { ArrowRight, CreditCard, GraduationCap, Megaphone, ReceiptText } from 'lucide-svelte';

  const { data } = $props();
  const students = $derived(data.students ?? []);
  const payments = $derived(data.payments ?? []);
  const announcements = $derived(data.announcements ?? []);
  const ledger = $derived(data.ledger ?? []);
  const totalBalance = $derived(ledger.reduce((sum: number, row: any) => sum + Number(row.balance ?? 0), 0));
  const childrenWithBalance = $derived(ledger.filter((row: any) => Number(row.balance ?? 0) > 0));
  const recentPayments = $derived(payments.slice(0, 5));

  const money = (value: unknown) => `KES ${Number(value ?? 0).toLocaleString()}`;
  const childName = (row: any) => `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'Child';
</script>

<svelte:head>
  <title>Parent home · eShule</title>
  <meta name="description" content="See your children's school information, balances, payments and announcements in eShule." />
</svelte:head>

<DashboardContent title="Your family" subtitle="See what needs your attention, then take the next action.">
  <div class="space-y-7">
    <section class="overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-white p-6 shadow-card sm:p-8">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">Parent home</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Welcome{data.parent?.first_name ? `, ${data.parent.first_name}` : ''}.</h1>
          <p class="mt-3 max-w-xl text-sm leading-6 text-ink-500">Your children's school records, fee balances and payment history are together here.</p>
        </div>
        <div class="rounded-2xl border border-white/80 bg-white px-5 py-4 shadow-sm">
          <p class="text-xs font-medium text-ink-500">Total outstanding</p>
          <p class="mt-1 text-2xl font-bold {totalBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}">{money(totalBalance)}</p>
        </div>
      </div>
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <a href="/parent/fees" class="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary">
          <CreditCard class="h-5 w-5 text-primary" />
          <p class="mt-3 text-sm font-semibold text-ink-900">Pay fees</p>
          <p class="mt-1 text-xs text-ink-500">Review balances and pay by M-Pesa.</p>
          <span class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open <ArrowRight class="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
        </a>
        <a href="/parent/payments" class="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary">
          <ReceiptText class="h-5 w-5 text-primary" />
          <p class="mt-3 text-sm font-semibold text-ink-900">Payment history</p>
          <p class="mt-1 text-xs text-ink-500">Find previous payments and receipts.</p>
          <span class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">View history <ArrowRight class="h-3.5 w-3.5" /></span>
        </a>
        <a href="/parent/timetable" class="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary">
          <GraduationCap class="h-5 w-5 text-primary" />
          <p class="mt-3 text-sm font-semibold text-ink-900">Children & schedule</p>
          <p class="mt-1 text-xs text-ink-500">Open your children's learning information.</p>
          <span class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">View schedule <ArrowRight class="h-3.5 w-3.5" /></span>
        </a>
      </div>
    </section>

    {#if childrenWithBalance.length > 0}
      <section aria-labelledby="attention-title">
        <div class="mb-4">
          <h2 id="attention-title" class="text-lg font-semibold text-ink-900">Needs attention</h2>
          <p class="mt-1 text-sm text-ink-400">Start with the children who have an outstanding balance.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each childrenWithBalance as child}
            <a href="/parent/fees" class="group rounded-2xl border border-amber-200 bg-amber-50/60 p-5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-base font-semibold text-ink-900">{childName(child)}</p>
                  <p class="mt-1 text-xs text-ink-500">{child.admission_no ?? '—'} · {child.grade ?? '—'}</p>
                </div>
                <span class="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">Outstanding</span>
              </div>
              <p class="mt-5 text-2xl font-bold text-amber-800">{money(child.balance)}</p>
              <span class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">Review and pay <ArrowRight class="h-3.5 w-3.5" /></span>
            </a>
          {/each}
        </div>
      </section>
    {:else if students.length > 0}
      <section class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <p class="text-sm font-semibold text-emerald-900">You're up to date</p>
        <p class="mt-1 text-sm text-emerald-800">No outstanding fee balance is currently showing for your children.</p>
      </section>
    {/if}

    <section aria-labelledby="children-title">
      <div class="mb-4 flex items-end justify-between gap-3">
        <div><h2 id="children-title" class="text-lg font-semibold text-ink-900">Your children</h2><p class="mt-1 text-sm text-ink-400">Open the information you need without searching the whole system.</p></div>
        <a href="/parent/child" class="text-xs font-semibold text-primary hover:underline">View all →</a>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each students as student}
          {@const balanceRow = ledger.find((row: any) => row.id === student.id || row.student_id === student.id || row.admission_no === student.admission_no)}
          <a href="/parent/child" class="group rounded-2xl border border-border/60 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hov focus:outline-none focus:ring-2 focus:ring-primary">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><GraduationCap class="h-5 w-5" /></div>
            <div class="mt-4 flex items-start justify-between gap-3"><div><h3 class="text-base font-semibold text-ink-900">{student.first_name} {student.last_name}</h3><p class="mt-1 text-xs text-ink-500">{student.admission_no} · {student.grade ?? '—'}</p></div><span class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{student.status ?? 'active'}</span></div>
            {#if balanceRow}
              <div class="mt-5 border-t border-border/60 pt-4"><p class="text-xs text-ink-400">Outstanding</p><p class="mt-1 text-lg font-bold {Number(balanceRow.balance ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}">{money(balanceRow.balance)}</p></div>
            {/if}
            <span class="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open child <ArrowRight class="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
          </a>
        {/each}
      </div>
      {#if students.length === 0}
        <div class="rounded-2xl border border-dashed border-border bg-slate-50 p-8 text-center"><GraduationCap class="mx-auto h-8 w-8 text-ink-300" /><p class="mt-3 text-sm font-semibold text-ink-700">No children linked yet</p><p class="mt-1 text-xs text-ink-400">Contact the school if your child should be linked to this parent account.</p></div>
      {/if}
    </section>

    <section aria-labelledby="payments-title" class="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
      <div class="flex flex-col gap-2 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 id="payments-title" class="text-lg font-semibold text-ink-900">Recent payments</h2><p class="mt-1 text-sm text-ink-400">Actual payment evidence recorded by the school.</p></div><a href="/parent/payments" class="text-xs font-semibold text-primary hover:underline">View history →</a></div>
      <DataTable data={recentPayments} columns={[{ key: 'created_at', label: 'Date', render: (p: any) => p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '—' }, { key: 'fee_type', label: 'Fee' }, { key: 'amount', label: 'Amount', render: (p: any) => money(p.amount) }, { key: 'domain', label: 'Type', render: (p: any) => p.domain === 'remedial' ? 'Remedial' : 'School' }]} emptyMessage="No payments yet" />
    </section>

    {#if announcements.length > 0}
      <section aria-labelledby="announcements-title">
        <div class="mb-4 flex items-center gap-2"><Megaphone class="h-5 w-5 text-primary" /><div><h2 id="announcements-title" class="text-lg font-semibold text-ink-900">Announcements</h2><p class="mt-1 text-sm text-ink-400">Important updates from your school.</p></div></div>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each announcements.slice(0, 4) as announcement}
            <article class="rounded-2xl border border-border/60 bg-white p-5 shadow-card"><div class="flex items-start justify-between gap-3"><h3 class="text-sm font-semibold text-ink-900">{announcement.title}</h3>{#if announcement.priority === 'urgent'}<span class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Urgent</span>{/if}</div><p class="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-5 text-ink-500">{announcement.body}</p>{#if announcement.published_at}<p class="mt-4 text-[11px] text-ink-400">{new Date(announcement.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>{/if}</article>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</DashboardContent>
