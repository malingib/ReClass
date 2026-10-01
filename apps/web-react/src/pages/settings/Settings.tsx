import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSchool, useUpdateSchool } from '@/hooks/useSchool';
import { DataTable } from '@/components/DataTable';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingButton,
  PageHeader,
  TableSkeleton,
} from '@/components/ui';
import { dateKE } from '@/lib/format';

// ── device-local persistence helper ──

function readPrefs<T extends Record<string, unknown>>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function writePrefs(key: string, value: Record<string, unknown>) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — surface via toast at the call site.
  }
}

// ──────────────────────────── SCHOOL PROFILE ────────────────────────────

export function SchoolProfile() {
  const { data: school, isLoading, isError, refetch } = useSchool();
  const update = useUpdateSchool();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    academic_year: '',
    timezone: 'Africa/Nairobi',
    sms_sender_id: '',
    logo_url: '',
    founded: '',
    school_type: '',
    board_affiliation: '',
    address: '',
    phone: '',
    email: '',
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (school && !loaded) {
      const settings = (school.settings ?? {}) as Record<string, string>;
      setForm({
        name: school.name ?? '',
        slug: school.slug ?? '',
        academic_year: school.academic_year ?? '',
        timezone: school.timezone ?? 'Africa/Nairobi',
        sms_sender_id: school.sms_sender_id ?? '',
        logo_url: school.logo_url ?? '',
        founded: settings.founded ?? '',
        school_type: settings.school_type ?? '',
        board_affiliation: settings.board_affiliation ?? '',
        address: settings.address ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
      });
      setLoaded(true);
    }
  }, [school, loaded]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error('School name is required.');
      return;
    }
    const existing = ((school?.settings ?? {}) as Record<string, unknown>);
    try {
      await update.mutateAsync({
        name: form.name.trim(),
        slug: form.slug.trim() || school?.slug,
        academic_year: form.academic_year.trim() || null,
        timezone: form.timezone.trim() || 'Africa/Nairobi',
        sms_sender_id: form.sms_sender_id.trim() || null,
        logo_url: form.logo_url.trim() || null,
        settings: {
          ...existing,
          founded: form.founded.trim() || null,
          school_type: form.school_type.trim() || null,
          board_affiliation: form.board_affiliation.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
        },
      } as Parameters<ReturnType<typeof useUpdateSchool>['mutateAsync']>[0]);
      toast.success('School profile saved.');
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    }
  }

  if (isLoading || !loaded) {
    if (isError) {
      return (
        <div className="max-w-2xl space-y-6">
          <PageHeader title="School profile" description="School information displayed on receipts, reports and parent portal." />
          <Card><CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">Could not load the school profile.</p>
            <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </CardContent></Card>
        </div>
      );
    }
    return <div className="space-y-4"><PageHeader title="School profile" /><TableSkeleton rows={6} /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="School profile" description="School information displayed on receipts, reports and parent portal." />
      <Card>
        <CardHeader><CardTitle>School details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="School name" hint="Appears on receipts and reports.">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Baraka Primary School" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="School code"><Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="BARAKA" /></Field>
            <Field label="Academic year"><Input value={form.academic_year} onChange={(e) => set('academic_year', e.target.value)} placeholder="2025" /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="P.O. Box 123-40100" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+254 700 000000" /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="info@school.com" /></Field>
            <Field label="Logo URL"><Input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." /></Field>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>School details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Founded"><Input value={form.founded} onChange={(e) => set('founded', e.target.value)} placeholder="e.g. 1990" /></Field>
            <Field label="School type">
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.school_type} onChange={(e) => set('school_type', e.target.value)}>
                <option value="">Select type</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="combined">Combined</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Board affiliation"><Input value={form.board_affiliation} onChange={(e) => set('board_affiliation', e.target.value)} placeholder="e.g. KCPE, KCSE" /></Field>
            <Field label="Timezone"><Input value={form.timezone} onChange={(e) => set('timezone', e.target.value)} placeholder="Africa/Nairobi" /></Field>
          </div>
          <Field label="SMS sender ID" hint="3–11 alphanumeric characters.">
            <Input value={form.sms_sender_id} onChange={(e) => set('sms_sender_id', e.target.value)} placeholder="SCHOOL" maxLength={11} />
          </Field>
        </CardContent>
      </Card>
      <LoadingButton loading={update.isPending} onClick={save}>Save profile</LoadingButton>
    </div>
  );
}

// ──────────────────────────── ACADEMIC YEAR ────────────────────────────

type Term = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

const FALLBACK_TERMS: Term[] = [
  { id: '1', name: 'Term 1 2025', start_date: '2025-01-06', end_date: '2025-04-04', is_current: false },
  { id: '2', name: 'Term 2 2025', start_date: '2025-04-28', end_date: '2025-08-01', is_current: true },
  { id: '3', name: 'Term 3 2025', start_date: '2025-09-01', end_date: '2025-11-28', is_current: false },
];

const TERMS_KEY = 'reclass-prefs:terms';

export function AcademicYear() {
  const [terms, setTerms] = useState<Term[]>(FALLBACK_TERMS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingLocal, setUsingLocal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from('terms').select('id,name,start_date,end_date,is_current').is('deleted_at', null).order('start_date');
        if (error) throw error;
        if (!cancelled && data && data.length > 0) {
          setTerms(data as Term[]);
          setUsingLocal(false);
        } else if (!cancelled) {
          const local = readPrefs<{ items: Term[] }>(TERMS_KEY, { items: FALLBACK_TERMS });
          if (local.items.length > 0) setTerms(local.items);
          setUsingLocal(true);
        }
      } catch {
        if (!cancelled) {
          const local = readPrefs<{ items: Term[] }>(TERMS_KEY, { items: FALLBACK_TERMS });
          if (local.items.length > 0) setTerms(local.items);
          setUsingLocal(true);
          setLoadError('Live terms table is unavailable; showing device-saved terms.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function persistLocal(items: Term[]) {
    writePrefs(TERMS_KEY, { items });
  }

  async function setCurrent(id: string) {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('set_current_term', { p_term_id: id });
      if (error) throw error;
      setTerms((prev) => prev.map((t) => ({ ...t, is_current: t.id === id })));
      toast.success('Current term updated.');
    } catch {
      const next = terms.map((t) => ({ ...t, is_current: t.id === id }));
      setTerms(next);
      persistLocal(next);
      setUsingLocal(true);
      toast.success('Current term updated on this device.');
    } finally {
      setSaving(false);
    }
  }

  async function createTerm() {
    if (!newName.trim()) {
      setFormError('Term name is required.');
      return;
    }
    if (!newStart || !newEnd) {
      setFormError('Start and end dates are required.');
      return;
    }
    if (newEnd < newStart) {
      setFormError('End date must be on or after the start date.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const { data, error } = await supabase.from('terms').insert({ name: newName.trim(), start_date: newStart, end_date: newEnd, is_current: false }).select('id,name,start_date,end_date,is_current').maybeSingle();
      if (error) throw error;
      if (data) {
        setTerms((prev) => [...prev, data as Term]);
        toast.success('Term created.');
      } else {
        throw new Error('No row returned.');
      }
    } catch {
      const next = [...terms, { id: `local-${Date.now()}`, name: newName.trim(), start_date: newStart, end_date: newEnd, is_current: false }];
      setTerms(next);
      persistLocal(next);
      setUsingLocal(true);
      toast.success('Term saved on this device.');
    } finally {
      setSaving(false);
      setNewName('');
      setNewStart('');
      setNewEnd('');
    }
  }

  if (loading) return <div className="space-y-4"><PageHeader title="Academic year" /><TableSkeleton rows={4} /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Academic year" description="Manage terms, set the current term and configure the academic calendar." />
      {loadError && <p className="text-xs text-muted-foreground">{loadError}</p>}
      <Card>
        <CardHeader><CardTitle>Terms</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={['Term', 'Start', 'End', 'Current', '']}
            rows={terms.map((t) => [
              t.name,
              dateKE(t.start_date),
              dateKE(t.end_date),
              t.is_current ? <Badge variant="success">Current</Badge> : <Badge variant="outline">—</Badge>,
              !t.is_current ? <Button key={t.id} variant="outline" size="sm" disabled={saving} onClick={() => setCurrent(t.id)}>Set current</Button> : null,
            ])}
            empty="No terms configured."
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Add term</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Term name"><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Term 1 2026" /></Field>
            <Field label="Start date"><Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></Field>
            <Field label="End date"><Input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></Field>
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <LoadingButton loading={saving} onClick={createTerm}>Add term</LoadingButton>
          {usingLocal && <p className="text-xs text-muted-foreground">Saved on this device until the live terms table is reachable.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── PROFILE SETTINGS ────────────────────────────

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isPhoneValid(phone: string): boolean {
  if (!phone.trim()) return true;
  const d = phone.replace(/[\s\-()]/g, '');
  return /^\+?254\d{9}$/.test(d) || /^0[17]\d{8}$/.test(d);
}

export function ProfileSettings() {
  const [name, setName] = useState('John Admin');
  const [email, setEmail] = useState('admin@school.com');
  const [phone, setPhone] = useState('254700000000');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || cancelled) return;
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      if (meta.full_name) setName(meta.full_name);
      if (user.email) setEmail(user.email);
      if (meta.phone) setPhone(meta.phone);
      if (meta.avatar_url) setPhotoPreview(meta.avatar_url);
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveProfile() {
    if (!name.trim()) {
      toast.error('Full name is required.');
      return;
    }
    if (!isEmailValid(email)) {
      toast.error('Enter a valid email address.');
      return;
    }
    if (!isPhoneValid(phone)) {
      toast.error('Enter a valid phone number (2547XXXXXXXX or 07XXXXXXXX).');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
        data: { full_name: name.trim(), phone: phone.trim() },
      });
      if (error) throw error;
      toast.success('Profile updated.');
    } catch (e) {
      toast.error(`Profile update failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPass.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('New passwords do not match.');
      return;
    }
    setChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      toast.success('Password changed.');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (e) {
      toast.error(`Password change failed: ${(e as Error).message}`);
    } finally {
      setChanging(false);
    }
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    toast.success('Photo preview ready. Upload wiring pending — preview only on this device.');
  }

  function removePhoto() {
    if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
    toast.success('Photo removed.');
  }

  const initials = name.trim().split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profile settings" description="Update your personal information and password." />
      <Card>
        <CardHeader><CardTitle>Personal information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {photoPreview
              ? <img src={photoPreview} alt="Profile preview" className="h-16 w-16 rounded-full object-cover" />
              : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-semibold">{initials}</div>}
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Change photo</Button>
              {photoPreview && <Button variant="ghost" size="sm" onClick={removePhoto}>Remove</Button>}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          </div>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <LoadingButton loading={saving} onClick={saveProfile}>Save profile</LoadingButton>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Current password"><Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="New password"><Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} /></Field>
            <Field label="Confirm password"><Input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} /></Field>
          </div>
          <LoadingButton loading={changing} disabled={!currentPass || !newPass || newPass !== confirmPass} onClick={changePassword}>Change password</LoadingButton>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── PAYMENT SETTINGS ────────────────────────────

export function PaymentSettings() {
  const { data: school } = useSchool();
  const update = useUpdateSchool();
  const [mpesaShortcode, setMpesaShortcode] = useState('');
  const [mpesaPaybill, setMpesaPaybill] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (school && !loaded) {
      setMpesaShortcode(school.mpesa_shortcode ?? '');
      setMpesaPaybill(school.mpesa_paybill ?? '');
      const settings = (school.settings ?? {}) as Record<string, string>;
      setBankName(settings.bank_name ?? '');
      setBankAccount(settings.bank_account ?? '');
      setBankBranch(settings.bank_branch ?? '');
      setLoaded(true);
    }
  }, [school, loaded]);

  async function save() {
    if (mpesaPaybill.trim() && !/^\d+$/.test(mpesaPaybill.trim())) {
      toast.error('Paybill number must contain digits only.');
      return;
    }
    if (mpesaShortcode.trim() && !/^\d+$/.test(mpesaShortcode.trim())) {
      toast.error('Shortcode must contain digits only.');
      return;
    }
    const existing = ((school?.settings ?? {}) as Record<string, unknown>);
    try {
      await update.mutateAsync({
        mpesa_shortcode: mpesaShortcode.trim() || null,
        mpesa_paybill: mpesaPaybill.trim() || null,
        settings: {
          ...existing,
          bank_name: bankName.trim() || null,
          bank_branch: bankBranch.trim() || null,
          bank_account: bankAccount.trim() || null,
        },
      } as Parameters<ReturnType<typeof useUpdateSchool>['mutateAsync']>[0]);
      toast.success('Payment settings saved.');
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Payment settings" description="Configure M-Pesa and bank account settings for fee collection." />
      <Card>
        <CardHeader><CardTitle>M-Pesa settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Paybill number"><Input value={mpesaPaybill} onChange={(e) => setMpesaPaybill(e.target.value)} placeholder="522522" inputMode="numeric" /></Field>
            <Field label="Shortcode"><Input value={mpesaShortcode} onChange={(e) => setMpesaShortcode(e.target.value)} placeholder="522522" inputMode="numeric" /></Field>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bank account settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Bank name"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. KCB" /></Field>
            <Field label="Branch"><Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder="e.g. Kisumu" /></Field>
          </div>
          <Field label="Account number"><Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="1299..." inputMode="numeric" /></Field>
        </CardContent>
      </Card>
      <LoadingButton loading={update.isPending} onClick={save}>Save payment settings</LoadingButton>
    </div>
  );
}

