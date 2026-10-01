import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParentScope } from '@/hooks/useParentScope';
import { DataTable } from '@/components/DataTable';
import {
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  LoadingButton,
  PageHeader,
  StatusPill,
  TableSkeleton,
} from '@/components/ui';
import { dateKE, datetimeKE, moneyKES, normalizeKEPhone, phoneDisplay } from '@/lib/format';
import { useParentStkPayment } from '@/hooks/useParentPayment';
import {
  GraduationCap,
  Wallet,
  CalendarCheck,
  CreditCard,
  Bell,
  TrendingUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Obligation = {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  fee_name: string;
  period_start: string;
  period_end: string;
  amount: number;
  paid_amount: number;
  balance: number;
  status: string;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
  phone: string;
  checkout_id?: string | null;
  receipt_number?: string | null;
  created_at: string;
  paid_at?: string | null;
  student_id: string;
};

type Child = {
  id: string;
  first_name: string;
  last_name: string;
  admission_no: string;
  grade: string;
  status: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const QUICK_LINK_TONES: Record<string, string> = {
  green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
};

async function callRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return (data ?? []) as T;
}

function useObligations() {
  return useQuery({
    queryKey: ['parent-reclass-obligations'],
    queryFn: () => callRpc<Obligation[]>('get_parent_reclass_obligations', {}),
  });
}

function usePayments() {
  return useQuery({
    queryKey: ['parent-reclass-payments'],
    queryFn: () => callRpc<Payment[]>('get_parent_reclass_payments', {}),
  });
}

/* ------------------------------------------------------------------ */
/*  ParentDashboard                                                    */
/* ------------------------------------------------------------------ */

export function ParentDashboard() {
  const { data: scope, isLoading: scopeLoading } = useParentScope();
  const studentIds = scope?.studentIds ?? [];
  const { data: obligations = [], isLoading: obligationsLoading } = useObligations();
  const { data: payments = [] } = usePayments();

  const { data: children = [] } = useQuery({
    queryKey: ['parent-children', studentIds],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id,first_name,last_name,admission_no,grade,status')
        .in('id', studentIds)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as Child[];
    },
  });

  const { data: attendanceRows = [] } = useQuery({
    queryKey: ['parent-children-attendance', studentIds],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('id,status')
        .in('student_id', studentIds)
        .limit(500);
      if (error) throw error;
      return (data ?? []) as { id: string; status: string }[];
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['parent-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comm_announcements')
        .select('id,title,published_at')
        .eq('status', 'published')
        .in('audience', ['all', 'parents'])
        .order('published_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; published_at: string | null }[];
    },
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['parent-upcoming-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_calendar_events')
        .select('id,title,starts_at,location')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; starts_at: string; location: string | null }[];
    },
  });

  const outstanding = useMemo(
    () => obligations.reduce((sum, item) => sum + Number(item.balance || 0), 0),
    [obligations],
  );
  const completed = payments.filter((payment) => payment.status === 'completed');
  const presentCount = attendanceRows.filter((row) => row.status === 'present' || row.status === 'late').length;
  const attendanceRate = attendanceRows.length > 0
    ? `${Math.round((presentCount / attendanceRows.length) * 100)}%`
    : 'No data';

  const currentHour = new Date().getHours();

  if (scopeLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'}, Parent
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's an overview of your children's school progress and fee status.
        </p>
      </div>

      {/* Children Cards */}
      {children.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id} className="transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{child.first_name} {child.last_name}</p>
                    <p className="text-sm text-muted-foreground">{child.grade} · {child.admission_no}</p>
                    <span className="mt-1 inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success-foreground capitalize">
                      {child.status || 'active'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold tabular-nums">{moneyKES(outstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Children</p>
                <p className="text-2xl font-bold">{children.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payments</p>
                <p className="text-2xl font-bold">{completed.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="text-2xl font-bold">{attendanceRate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Status + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Fee Status</span>
                <ButtonLink to="/parent/pay" variant="outline" size="sm">
                  Pay Now
                </ButtonLink>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {obligationsLoading ? (
                <TableSkeleton rows={3} />
              ) : obligations.length === 0 ? (
                <EmptyState
                  title="No outstanding fees"
                  description="All fee obligations are settled."
                />
              ) : (
                <div className="space-y-3">
                  {obligations.map((obligation) => (
                    <div key={obligation.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{obligation.student_name}</p>
                        <p className="text-xs text-muted-foreground">{obligation.fee_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">{moneyKES(obligation.balance)}</p>
                        <StatusPill status={obligation.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <EmptyState
                  title="No announcements"
                  description="Published announcements will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{ann.title}</p>
                      {ann.published_at && (
                        <p className="text-xs text-muted-foreground">{dateKE(ann.published_at)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  title="No upcoming events"
                  description="Scheduled school events will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateKE(event.starts_at)}{event.location ? ` · ${event.location}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { to: '/parent/pay', label: 'Pay Fees', icon: CreditCard, color: 'green' },
              { to: '/parent/payments', label: 'Payment History', icon: Wallet, color: 'blue' },
              { to: '/parent/timetable', label: 'Timetable', icon: CalendarCheck, color: 'purple' },
              { to: '/notifications', label: 'Notifications', icon: Bell, color: 'orange' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:shadow-md hover:bg-primary/5"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${QUICK_LINK_TONES[link.color] ?? QUICK_LINK_TONES.blue}`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ParentPay                                                          */
/* ------------------------------------------------------------------ */

export function ParentPay() {
  const { data: obligations = [], isLoading } = useObligations();
  const [obligationId, setObligationId] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [amount, setAmount] = useState('');
  const pay = useParentStkPayment();

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return;
      const { data } = await supabase.from('parents').select('phone').eq('profile_id', uid).maybeSingle();
      const normalized = normalizeKEPhone((data as { phone?: string } | null)?.phone);
      if (normalized) setPhone(normalized);
    })();
  }, []);

  const payable = obligations.filter((item) => Number(item.balance) > 0 && item.status !== 'cancelled');
  const selected = payable.find((item) => item.id === obligationId);
  const normalizedPhone = normalizeKEPhone(phone);
  const phoneError = phoneTouched && !normalizedPhone ? 'Enter a valid Safaricom number, e.g. 0712345678.' : '';
  const requested = Number(amount);
  const amountError =
    amount !== '' && (!Number.isFinite(requested) || requested <= 0)
      ? 'Enter an amount greater than zero.'
      : selected && Number.isFinite(requested) && requested > Number(selected.balance)
        ? `The most you can pay now is ${moneyKES(selected.balance)}.`
        : '';

  function selectObligation(id: string) {
    setObligationId(id);
    const item = payable.find((o) => o.id === id);
    setAmount(item ? String(item.balance) : '');
    pay.reset();
  }

  const canSubmit =
    !!selected &&
    !!normalizedPhone &&
    Number.isFinite(requested) &&
    requested > 0 &&
    requested <= Number(selected.balance) &&
    !pay.tracking;

  return (
    <div className="max-w-lg space-y-5">
      <PageHeader title="Pay fees" description="Pay by M-Pesa STK push. The amount can never exceed the outstanding balance." />
      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : (
        <>
          <Field label="Obligation" error={payable.length === 0 ? 'No outstanding obligations.' : undefined}>
            <select className="h-10 w-full rounded-md border bg-background px-3" value={obligationId} onChange={(e) => selectObligation(e.target.value)}>
              <option value="">Select an outstanding obligation</option>
              {payable.map((item) => (
                <option key={item.id} value={item.id}>{item.student_name} — {item.fee_name} — {moneyKES(item.balance)} outstanding</option>
              ))}
            </select>
          </Field>
          <Field label="M-Pesa phone" hint="The STK prompt goes to this number." error={phoneError}>
            <Input placeholder="0712345678" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneTouched(true); }} inputMode="tel" autoComplete="tel" />
          </Field>
          <Field label="Amount (KES)" error={amountError}>
            <div className="flex gap-2">
              <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="tabular-nums" />
              {selected && <Button type="button" variant="outline" onClick={() => setAmount(String(selected.balance))}>Full balance</Button>}
            </div>
          </Field>
          {selected && <p className="text-xs text-muted-foreground">Outstanding balance: {moneyKES(selected.balance)} · You pay: {moneyKES(Number.isFinite(requested) ? requested : 0)}</p>}
          <LoadingButton loading={pay.sending} disabled={!canSubmit} onClick={() => selected && pay.send(selected.id, requested, normalizedPhone)} className="w-full sm:w-auto">
            Send STK push
          </LoadingButton>

          {pay.tracking && (
            <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/10 p-4" role="status">
              <p className="text-sm font-medium">Waiting for your M-Pesa PIN…</p>
              <p className="text-sm text-muted-foreground">A prompt was sent to {phoneDisplay(normalizedPhone)}. Enter your PIN to complete {moneyKES(pay.tracking.amount)}. This page updates automatically.</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/3 animate-pulse rounded-full bg-warning" /></div>
            </div>
          )}
          {pay.result === 'completed' && (
            <div className="space-y-2 rounded-xl border border-success/30 bg-success/10 p-4" role="status">
              <p className="text-sm font-medium">Payment received.</p>
              <p className="text-sm text-muted-foreground">Receipt {pay.receiptNumber ?? 'issued'} · {moneyKES(pay.tracking?.amount ?? requested)}. <Link to="/parent/payments" className="underline underline-offset-4">View in payment history</Link></p>
              <Button variant="outline" onClick={() => { selectObligation(''); }}>Make another payment</Button>
            </div>
          )}
          {pay.result === 'failed' && (
            <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
              <p className="text-sm font-medium">Payment did not complete.</p>
              <p className="text-sm text-muted-foreground">No money was deducted. Check your balance and <Link to="/parent/payments" className="underline underline-offset-4">payment history</Link>, then try again.</p>
              <Button variant="outline" onClick={() => pay.reset()}>Try again</Button>
            </div>
          )}
          {pay.result === 'timeout' && (
            <div className="space-y-2 rounded-xl border p-4" role="status">
              <p className="text-sm font-medium">Still processing.</p>
              <p className="text-sm text-muted-foreground">We could not confirm within two minutes. If you entered your PIN, the payment may still land — <Link to="/parent/payments" className="underline underline-offset-4">check payment history</Link> before retrying.</p>
              <Button variant="outline" onClick={() => pay.reset()}>Back</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ParentPayments                                                     */
/* ------------------------------------------------------------------ */

export function ParentPayments() {
  const { data = [], isLoading } = usePayments();

  if (isLoading)
    return (
      <div className="space-y-4">
        <PageHeader title="My payments" description="Only payments belonging to your linked students are shown." />
        <TableSkeleton />
      </div>
    );
  if (data.length === 0)
    return (
      <div className="space-y-4">
        <PageHeader title="My payments" description="Only payments belonging to your linked students are shown." />
        <EmptyState title="No payments yet" description="Completed M-Pesa payments and receipts will appear here." action={<ButtonLink to="/parent/pay">Pay now</ButtonLink>} />
      </div>
    );

  return (
    <div className="space-y-4">
      <PageHeader title="My payments" description="Newest first. Every completed payment carries an official receipt number." />
      <ol className="relative space-y-4 border-l border-border pl-5">
        {data.map((item) => (
          <li key={item.id} className="relative">
            <span className={`absolute -left-[25px] top-1 size-2.5 rounded-full ${item.status === 'completed' ? 'bg-success' : item.status === 'failed' ? 'bg-destructive' : 'bg-warning'}`} aria-hidden />
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold tabular-nums">{moneyKES(item.amount)}</p>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{datetimeKE(item.paid_at ?? item.created_at)}{item.receipt_number ? ` · Receipt ${item.receipt_number}` : ''}</p>
              <p className="mt-1 text-xs text-muted-foreground">M-Pesa {phoneDisplay(item.phone)}{item.checkout_id ? ` · Ref ${item.checkout_id.slice(0, 8)}…` : ''}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timetable                                                          */
/* ------------------------------------------------------------------ */

export function Timetable({ who }: { who: string }) {
  const { data: scope, isLoading: scopeLoading } = useParentScope();
  const studentIds = scope?.studentIds ?? [];

  // who="teacher": resolve the teacher record for the signed-in user.
  const { data: sessionData } = useQuery({
    queryKey: ['timetable-session'],
    queryFn: async () => supabase.auth.getSession(),
  });
  const uid = sessionData?.data.session?.user.id;
  const { data: teacher } = useQuery({
    queryKey: ['timetable-teacher', uid],
    enabled: who === 'teacher' && !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', uid!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
  });

  // who="parent": scope by the children's grades against occurrence classes.
  const { data: children = [] } = useQuery({
    queryKey: ['timetable-children', studentIds],
    enabled: who === 'parent' && studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id,grade')
        .in('id', studentIds)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as { id: string; grade: string | null }[];
    },
  });
  const grades = [...new Set(children.map((c) => c.grade).filter((g): g is string => !!g))];

  const ready = who === 'teacher' ? !!teacher?.id : who === 'parent' ? studentIds.length > 0 : true;
  const { data: occurrences = [], isLoading: occurrencesLoading } = useQuery({
    queryKey: ['timetable-occurrences', who, teacher?.id, grades],
    enabled: ready,
    queryFn: async () => {
      let q = supabase
        .from('session_occurrences')
        .select('id,occurs_on,start_time,end_time,class,room,status')
        .order('occurs_on', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(50);
      if (who === 'teacher' && teacher?.id) q = q.eq('teacher_id', teacher.id);
      if (who === 'parent' && grades.length > 0) q = q.in('class', grades);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; occurs_on: string; start_time: string; end_time: string; class: string | null; room: string | null; status: string }[];
    },
  });

  if (scopeLoading || occurrencesLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Timetable" description={who === 'parent' ? 'Upcoming sessions for your children.' : 'Your upcoming teaching sessions.'} />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (who === 'parent' && studentIds.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Timetable" description="Upcoming sessions for your children." />
        <EmptyState
          title="No linked students"
          description="No student is linked to this account yet, so there is no timetable to show."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Timetable" description={who === 'parent' ? 'Upcoming sessions for your children.' : 'Your upcoming teaching sessions.'} />
      <DataTable
        columns={['Date', 'Time', 'Class', 'Room', 'Status']}
        rows={occurrences.map((r) => [
          dateKE(r.occurs_on),
          `${r.start_time}–${r.end_time}`,
          r.class ?? '—',
          r.room ?? '—',
          <StatusPill key={r.id} status={r.status} />,
        ])}
        empty="No sessions scheduled."
      />
    </div>
  );
}
