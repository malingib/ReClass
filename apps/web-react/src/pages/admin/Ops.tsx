import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/DataTable';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingButton,
  PageHeader,
  StatusPill,
  TableSkeleton,
} from '@/components/ui';
import { useSchool, useUpdateSchool } from '@/hooks/useSchool';
import {
  Settings,
  Users as UsersIcon,
  Upload,
  Building2,
  GraduationCap,
  DollarSign,
  MessageSquare,
  Save,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  'school_admin',
  'principal',
  'teacher',
  'remedial_teacher',
  'bursar',
  'payroll',
  'reclass_chair',
  'reclass_secretary',
  'reclass_treasurer',
  'reclass_member',
  'parent',
] as const;

const ROLE_LABELS: Record<string, string> = {
  school_admin: 'School Admin',
  principal: 'Principal',
  teacher: 'Teacher',
  remedial_teacher: 'Remedial Teacher',
  bursar: 'Bursar',
  payroll: 'Payroll',
  reclass_chair: 'ReClass Chair',
  reclass_secretary: 'ReClass Secretary',
  reclass_treasurer: 'ReClass Treasurer',
  reclass_member: 'ReClass Committee Member',
  parent: 'Parent',
};

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  school_admin: Settings,
  principal: GraduationCap,
  teacher: UsersIcon,
  remedial_teacher: UsersIcon,
  bursar: DollarSign,
  payroll: DollarSign,
  reclass_chair: UsersIcon,
  reclass_secretary: UsersIcon,
  reclass_treasurer: DollarSign,
  reclass_member: UsersIcon,
  parent: UsersIcon,
};

/* ─── StudentImport ─── */

const REQUIRED_STUDENT_HEADERS = ['admission_no', 'first_name', 'last_name', 'grade'] as const;

/** Quote-aware CSV line splitter: handles quoted commas and escaped quotes. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function StudentImport() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | ''>('');
  const [busy, setBusy] = useState(false);
  const [rowPreview, setRowPreview] = useState<string[]>([]);

  async function onFile(f: File) {
    setBusy(true);
    setMsg('');
    setMsgType('');
    setRowPreview([]);

    try {
      const text = await f.text();
      const lines = text.trim().split(/\r?\n/).filter(Boolean);

      if (lines.length < 2) {
        throw new Error('CSV must contain a header and at least one data row.');
      }

      const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase()).filter(Boolean);
      const missing = REQUIRED_STUDENT_HEADERS.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        throw new Error(`Missing required column(s): ${missing.join(', ')}.`);
      }

      const rows = lines.slice(1).map((l, lineNo) => {
        const cells = splitCsvLine(l);
        if (cells.length !== headers.length) {
          throw new Error(`Row ${lineNo + 2} has ${cells.length} cells but the header has ${headers.length}.`);
        }
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = cells[i] ?? '';
        });
        for (const h of REQUIRED_STUDENT_HEADERS) {
          if (!row[h]?.trim()) throw new Error(`Row ${lineNo + 2} is missing required value for "${h}".`);
        }
        return {
          admission_no: row.admission_no.trim(),
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
          grade: row.grade.trim(),
          ...(row.status?.trim() ? { status: row.status.trim() } : {}),
          ...(row.photo_url?.trim() ? { photo_url: row.photo_url.trim() } : {}),
        };
      });

      setRowPreview(rows.slice(0, 3).map((r) => `${r.first_name ?? ''} ${r.last_name ?? ''} (${r.admission_no ?? ''})`));

      const { error } = await supabase.from('students').insert(rows);
      if (error) throw error;

      await qc.invalidateQueries({ queryKey: ['students'] });
      setMsg(`Successfully imported ${rows.length} students.`);
      setMsgType('success');
      toast.success(`Imported ${rows.length} students.`);
    } catch (e) {
      const message = `Import failed: ${(e as Error).message}`;
      setMsg(message);
      setMsgType('error');
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SIS"
        title="Import Students"
        description="Bulk-import students from a CSV file. Required columns: admission_no, first_name, last_name, grade."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            <CardTitle>CSV Import</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center">
            <Upload className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop your CSV file here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports .csv files with headers: admission_no, first_name, last_name, grade
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              className="mx-auto mt-4 max-w-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </div>

          {busy && (
            <div className="flex items-center gap-2 rounded-md bg-primary/5 p-3 text-sm text-primary">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Importing records…
            </div>
          )}

          {msg && (
            <div
              className={cn(
                'flex items-start gap-2 rounded-md p-3 text-sm',
                msgType === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              )}
            >
              {msgType === 'success' ? (
                <CheckCircle className="mt-0.5 size-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
              )}
              {msg}
            </div>
          )}

          {rowPreview.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Preview (first rows):</p>
              {rowPreview.map((r, i) => (
                <div key={i} className="rounded bg-muted/50 px-2 py-1 text-xs">
                  {r}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Column</th>
                  <th className="pb-2 font-medium text-muted-foreground">Required</th>
                  <th className="pb-2 font-medium text-muted-foreground">Example</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { col: 'admission_no', req: 'Yes', ex: 'ADM001' },
                  { col: 'first_name', req: 'Yes', ex: 'Jane' },
                  { col: 'last_name', req: 'Yes', ex: 'Doe' },
                  { col: 'grade', req: 'Yes', ex: 'Grade 3' },
                  { col: 'status', req: 'No', ex: 'active' },
                  { col: 'photo_url', req: 'No', ex: 'https://…' },
                ].map((row) => (
                  <tr key={row.col} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{row.col}</td>
                    <td className="py-2">
                      {row.req === 'Yes' ? (
                        <span className="text-xs font-medium text-red-600">Required</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Optional</span>
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground">{row.ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Users ─── */

export function Users() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>('teacher');

  const q = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*').limit(200);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!userId.trim()) throw new Error('Enter a user ID.');
      const { error } = await supabase.from('user_roles').insert({ user_id: userId.trim(), role });
      if (error) throw error;
    },
    onSuccess: () => {
      setUserId('');
      toast.success('Role assigned successfully.');
      void qc.invalidateQueries({ queryKey: ['user-roles'] });
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  const revoke = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role revoked.');
      void qc.invalidateQueries({ queryKey: ['user-roles'] });
    },
    onError: (e) => toast.error(`Revoke failed: ${(e as Error).message}`),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users & Roles"
        description="Assign school roles and ReClass committee roles. Access is enforced by the permission matrix."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <CardTitle>Assign Role</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              className="sm:max-w-md"
              placeholder="Enter user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLE_OPTIONS)[number])}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <LoadingButton loading={assign.isPending} onClick={() => assign.mutate()}>
              Assign Role
            </LoadingButton>
          </div>

          {/* Role descriptions */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_OPTIONS.map((r) => {
              const Icon = ROLE_ICONS[r] ?? UsersIcon;
              return (
                <div
                  key={r}
                  className={cn(
                    'flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors',
                    role === r
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/30 hover:bg-muted/50'
                  )}
                >
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">{ROLE_LABELS[r]}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Roles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {q.isLoading ? (
            <TableSkeleton rows={5} />
          ) : q.isError ? (
            <div className="space-y-3 p-6 text-sm">
              <p className="text-destructive">Unable to load assigned roles. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => q.refetch()}>Retry</Button>
            </div>
          ) : (
            <DataTable
              columns={['User ID', 'Role', '']}
              rows={(q.data ?? []).map((r) => {
                const roleId = String(r.role ?? '');
                const roleLabel = ROLE_LABELS[roleId] ?? roleId;
                const Icon = ROLE_ICONS[roleId] ?? UsersIcon;
                const rowId = String(r.id ?? r.user_id ?? roleId);
                return [
                  String(r.user_id ?? '—'),
                  <span key={`role-${rowId}`} className="flex items-center gap-1.5">
                    <Icon className="size-3.5 text-muted-foreground" />
                    {roleLabel}
                  </span>,
                  r.id ? (
                    <ConfirmDelete
                      key={`revoke-${rowId}`}
                      label="Revoke"
                      onConfirm={() => revoke.mutateAsync(String(r.id))}
                    />
                  ) : (
                    <StatusPill key={`status-${rowId}`} status="active" />
                  ),
                ];
              })}
              empty="No roles assigned yet. Use the form above to assign roles."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── SchoolSettings ─── */

type Channel = 'bank' | 'mpesa';

type SettingsTab = 'general' | 'academic' | 'financial' | 'communication';

type SettingsForm = {
  name: string;
  slug: string;
  academic_year: string;
  timezone: string;
  sms_sender_id: string;
  school_channel: Channel;
  mpesa_paybill: string;
  mpesa_shortcode: string;
  bank_name: string;
  bank_account_no: string;
  bank_branch: string;
  remedial_channel: Channel;
  remedial_paybill: string;
};

const EMPTY: SettingsForm = {
  name: '',
  slug: '',
  academic_year: '',
  timezone: 'Africa/Nairobi',
  sms_sender_id: '',
  school_channel: 'bank',
  mpesa_paybill: '',
  mpesa_shortcode: '',
  bank_name: '',
  bank_account_no: '',
  bank_branch: '',
  remedial_channel: 'mpesa',
  remedial_paybill: '',
};

function fromSchool(school: ReturnType<typeof useSchool>['data']): SettingsForm {
  const settings = (school?.settings ?? {}) as Record<string, string>;
  return {
    name: school?.name ?? '',
    slug: school?.slug ?? '',
    academic_year: school?.academic_year ?? '',
    timezone: school?.timezone ?? 'Africa/Nairobi',
    sms_sender_id: school?.sms_sender_id ?? '',
    school_channel: school?.school_payment_channel === 'mpesa' ? 'mpesa' : 'bank',
    mpesa_paybill: school?.mpesa_paybill ?? '',
    mpesa_shortcode: school?.mpesa_shortcode ?? '',
    bank_name: settings.bank_name ?? '',
    bank_account_no: settings.bank_account_no ?? '',
    bank_branch: settings.bank_branch ?? '',
    remedial_channel: school?.remedial_payment_channel === 'bank' ? 'bank' : 'mpesa',
    remedial_paybill: settings.remedial_paybill ?? '',
  };
}

function ChannelPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: Channel;
  onChange: (c: Channel) => void;
  hint: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        {(['mpesa', 'bank'] as Channel[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={value === c}
            className={cn(
              'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              value === c
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            {c === 'mpesa' ? 'M-Pesa STK Push' : 'Bank Transfer'}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function SchoolSettings() {
  const { data: school, isLoading } = useSchool();
  const update = useUpdateSchool();
  const [form, setForm] = useState<SettingsForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useEffect(() => {
    if (school && !loaded) {
      setForm(fromSchool(school));
      setLoaded(true);
    }
  }, [school, loaded]);

  function set<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'School name is required.';
    if (form.sms_sender_id && !/^[A-Za-z0-9 ]{3,11}$/.test(form.sms_sender_id))
      return 'Sender ID must be 3–11 letters/numbers (e.g. ESHULE).';
    if (form.school_channel === 'mpesa') {
      if (!/^[0-9]{5,7}$/.test(form.mpesa_paybill))
        return 'School M-Pesa needs a 5–7 digit paybill number.';
      if (form.mpesa_shortcode && !/^[0-9]{5,7}$/.test(form.mpesa_shortcode))
        return 'Shortcode must be 5–7 digits.';
    } else if (!form.bank_account_no.trim()) {
      return 'Bank account number is required when school fees collect by bank transfer.';
    }
    if (form.remedial_channel === 'mpesa') {
      const bill = form.remedial_paybill || form.mpesa_paybill;
      if (!/^[0-9]{5,7}$/.test(bill))
        return 'Remedial M-Pesa needs a paybill — enter one below or set the school paybill above.';
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    const existing = (school?.settings ?? {}) as Record<string, unknown>;
    try {
      await update.mutateAsync({
        name: form.name.trim(),
        slug: form.slug.trim() || school?.slug,
        academic_year: form.academic_year.trim() || null,
        timezone: form.timezone.trim() || 'Africa/Nairobi',
        sms_sender_id: form.sms_sender_id.trim() || null,
        school_payment_channel: form.school_channel,
        remedial_payment_channel: form.remedial_channel,
        mpesa_paybill: form.mpesa_paybill.trim() || null,
        mpesa_shortcode: form.mpesa_shortcode.trim() || null,
        settings: {
          ...existing,
          bank_name: form.bank_name.trim() || null,
          bank_account_no: form.bank_account_no.trim() || null,
          bank_branch: form.bank_branch.trim() || null,
          remedial_paybill: form.remedial_paybill.trim() || null,
        },
      } as Parameters<ReturnType<typeof useUpdateSchool>['mutateAsync']>[0]);
      toast.success('School settings saved — changes apply immediately.');
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    }
  }

  if (isLoading || !loaded) {
    return (
      <div className="space-y-6">
        <PageHeader title="School Settings" description="Identity and collection channels." />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="School Settings"
        description="Manage your school's identity, academic year, payment channels, and communication settings."
        action={
          <LoadingButton loading={update.isPending} onClick={save}>
            <Save className="size-4" />
            Save Settings
          </LoadingButton>
        }
      />

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <CardTitle>School Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="School name" hint="Appears on receipts, SMS, and parent pages.">
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Baraka Primary School"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="School code" hint="Short unique code, e.g. BARAKA.">
                <Input
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="BARAKA"
                />
              </Field>
              <Field label="Academic year" hint="e.g. 2026.">
                <Input
                  value={form.academic_year}
                  onChange={(e) => set('academic_year', e.target.value)}
                  placeholder="2026"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Timezone">
                <Input
                  value={form.timezone}
                  onChange={(e) => set('timezone', e.target.value)}
                  placeholder="Africa/Nairobi"
                />
              </Field>
              <Field label="SMS sender name" hint="3–11 characters shown as the SMS sender.">
                <Input
                  value={form.sms_sender_id}
                  onChange={(e) => set('sms_sender_id', e.target.value)}
                  placeholder="ESHULE"
                  maxLength={11}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Academic Tab */}
      {activeTab === 'academic' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              <CardTitle>Academic Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Academic year" hint="Current academic year for attendance and reporting.">
              <Input
                value={form.academic_year}
                onChange={(e) => set('academic_year', e.target.value)}
                placeholder="2026"
              />
            </Field>
            <Field label="Timezone" hint="Used for attendance timestamps and scheduling.">
              <Input
                value={form.timezone}
                onChange={(e) => set('timezone', e.target.value)}
                placeholder="Africa/Nairobi"
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-primary" />
                <CardTitle>School Fee Collection</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChannelPicker
                label="How parents pay school fees"
                value={form.school_channel}
                onChange={(c) => set('school_channel', c)}
                hint={
                  form.school_channel === 'mpesa'
                    ? 'Parents get an STK prompt on their phone. Auto-reconciled.'
                    : 'Parents pay at the bank. Match deposits from the unmatched queue.'
                }
              />
              {form.school_channel === 'mpesa' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="M-Pesa paybill" hint="Business number parents send to.">
                    <Input
                      value={form.mpesa_paybill}
                      onChange={(e) => set('mpesa_paybill', e.target.value)}
                      inputMode="numeric"
                      placeholder="e.g. 522522"
                    />
                  </Field>
                  <Field label="Shortcode (optional)" hint="STK push shortcode, if different.">
                    <Input
                      value={form.mpesa_shortcode}
                      onChange={(e) => set('mpesa_shortcode', e.target.value)}
                      inputMode="numeric"
                      placeholder="e.g. 522522"
                    />
                  </Field>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Bank name">
                      <Input
                        value={form.bank_name}
                        onChange={(e) => set('bank_name', e.target.value)}
                        placeholder="e.g. KCB"
                      />
                    </Field>
                    <Field label="Branch">
                      <Input
                        value={form.bank_branch}
                        onChange={(e) => set('bank_branch', e.target.value)}
                        placeholder="e.g. Kisumu"
                      />
                    </Field>
                  </div>
                  <Field label="Account number" hint="Shown to parents on fee statements.">
                    <Input
                      value={form.bank_account_no}
                      onChange={(e) => set('bank_account_no', e.target.value)}
                      inputMode="numeric"
                      placeholder="e.g. 1299…"
                    />
                  </Field>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Remedial (ReClass) Collection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChannelPicker
                label="How parents pay remedial fees"
                value={form.remedial_channel}
                onChange={(c) => set('remedial_channel', c)}
                hint="Independent from school fees — ReClass can be instant STK while tuition is bank."
              />
              {form.remedial_channel === 'mpesa' ? (
                <Field
                  label="Remedial paybill (optional)"
                  hint={
                    form.mpesa_paybill
                      ? `Leave blank to reuse the school paybill ${form.mpesa_paybill}.`
                      : 'Set the school paybill above, or enter a dedicated one here.'
                  }
                >
                  <Input
                    value={form.remedial_paybill}
                    onChange={(e) => set('remedial_paybill', e.target.value)}
                    inputMode="numeric"
                    placeholder={form.mpesa_paybill || 'e.g. 522533'}
                  />
                </Field>
              ) : (
                <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  Remedial bank payments use the school bank details above. Match them from the{' '}
                  <Link to="/admin/payments/unmatched" className="underline underline-offset-4">
                    unmatched queue
                  </Link>{' '}
                  using the admission number the parent typed as the account reference.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Communication Tab */}
      {activeTab === 'communication' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <CardTitle>Communication Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="SMS sender name" hint="3–11 characters. Shown as the sender on parent SMS.">
              <Input
                value={form.sms_sender_id}
                onChange={(e) => set('sms_sender_id', e.target.value)}
                placeholder="ESHULE"
                maxLength={11}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              SMS messages are sent via the configured sender ID. Parent notifications are automatically
              triggered for fee reminders, attendance alerts, and exam results.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save Button (mobile) */}
      <div className="flex justify-end sm:hidden">
        <LoadingButton loading={update.isPending} onClick={save} className="w-full">
          <Save className="size-4" />
          Save Settings
        </LoadingButton>
      </div>
    </div>
  );
}

export const TenantSettings = SchoolSettings;
