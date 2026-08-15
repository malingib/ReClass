import { getPlatformConfig } from '../_platform/platform';
import { logError } from '../_platform/log';

/**
 * Parent provisioning — creates/refreshes the parent's login account.
 *
 * The founder's model (no self-signup): school staff add a parent (national ID
 * + phone) in the SIS, and the parent is provisioned with an auth account and
 * told their credentials by SMS. One parent = one login, and that login shows
 * ALL their enrolled children (parents.link children via guardians_link).
 *
 * Login contract (see src/routes/login):
 *   identifier = National ID  (looked up against parents.national_id)
 *   password   = phone number (normalized to 254…, and shown verbatim in SMS)
 *   auth email is a deterministic internal handle (parent.<id>@eshule.co.ke)
 *   stored on parents.auth_email for the login page to resolve.
 *
 * Provisioning is idempotent: it can safely be called on create/update/resend
 * and will only (re)create the auth account when none exists, then always
 * re-arms the password to the current phone and re-sends the login SMS (the
 * lone "resend keeps credentials in sync with a phone edit" behaviour).
 */

export type ProvisionResult =
  | { ok: true; created: boolean; smsSent: boolean; message: string }
  | { ok: false; message: string };

type ParentRow = {
  id: string;
  full_name: string;
  phone: string;
  national_id: string | null;
  auth_email: string | null;
  sms_consent: boolean | null;
  profile_id: string | null;
};

/** Normalize a phone to the 254-prefixed form used as the login password. */
export function normalizePhone(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.startsWith('254')) return digits;
  if (/^7\d{8}$/.test(digits)) return `254${digits}`;
  return digits;
}

/** Deterministic auth handle for a parent. Never shown to the parent. */
export function makeParentAuthEmail(nationalId: string): string {
  const id = nationalId.replace(/[^A-Za-z0-9]/g, '');
  return `parent.${id}@eshule.co.ke`;
}

/** Parent-portal base URL: platform_config.app_url, else a sane default. */
export async function getAppUrl(sb: App.Locals['srv']): Promise<string> {
  const config = await getPlatformConfig(sb);
  return config.app_url?.replace(/\/+$/, '') || 'https://app.eshule.co.ke';
}

async function findAuthUserByEmail(sb: App.Locals['srv'], email: string) {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    logError('parent_provision_lookup_user', error, { email });
    return null;
  }
  return (data?.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureAppRows(
  sb: App.Locals['srv'],
  tenantId: string,
  userId: string,
  parent: ParentRow,
  authEmail: string,
  nationalId: string,
) {
  // Profile row (auth.users.id → profiles.id). Upsert keeps phone/national_id fresh.
  const { error: profErr } = await sb
    .from('profiles')
    .upsert({
      id: userId,
      tenant_id: tenantId,
      full_name: parent.full_name,
      phone: parent.phone ?? null,
      national_id: nationalId,
      locale: 'en',
    }, { onConflict: 'id' });
  if (profErr) logError('parent_provision_profile', profErr, { parentId: parent.id, userId });

  const { error: roleErr } = await sb
    .from('user_roles')
    .upsert({
      tenant_id: tenantId,
      user_id: userId,
      role: 'parent',
    }, { onConflict: 'tenant_id,user_id,role' });
  if (roleErr) logError('parent_provision_role', roleErr, { parentId: parent.id, userId });

  const { error: linkErr } = await sb
    .from('parents')
    .update({ profile_id: userId, auth_email: authEmail })
    .eq('id', parent.id)
    .eq('tenant_id', tenantId);
  if (linkErr) logError('parent_provision_link', linkErr, { parentId: parent.id, userId });
}

async function enqueueLoginSms(
  sb: App.Locals['srv'],
  tenantId: string,
  parent: ParentRow,
  nationalId: string,
  normPhone: string,
): Promise<boolean> {
  if (!parent.sms_consent) return false;

  const { data: toggleOn } = await sb.rpc('tenant_setting_enabled', {
    p_tenant: tenantId,
    p_key: 'sms_provision_parent',
  });
  if (toggleOn === false) return false;

  const [appUrl, schoolRes] = await Promise.all([
    getAppUrl(sb),
    sb.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
  ]);
  const schoolName = schoolRes.data?.name ?? 'school';
  const externalId = `parent-login:${parent.id}:${new Date().toISOString().slice(0, 10)}`;

  const { data: existing } = await sb
    .from('notifications')
    .select('id')
    .eq('channel', 'sms')
    .eq('external_id', externalId)
    .maybeSingle();
  if (existing) return true;

  const { error } = await sb.from('notifications').insert({
    tenant_id: tenantId,
    channel: 'sms',
    recipient: parent.phone,
    external_id: externalId,
    body: `eShule: Your ${schoolName} parent portal is ready. Log in at ${appUrl}/login. Use National ID ${nationalId} and phone ${normPhone} as your password. One login shows all your enrolled children.`,
    status: 'queued',
  });
  if (error && error.code !== '23505') {
    logError('parent_provision_sms', error, { parentId: parent.id });
    return false;
  }
  return true;
}

/**
 * Provision (or refresh) a parent's login account and SMS their credentials.
 *
 * Idempotent per parent. Re-running after a phone edit re-arms the password
 * and resends credentials. Multi-student parents are handled naturally: this
 * provisions the parent, whose portal already lists every linked child.
 */
export async function provisionParent(
  sb: App.Locals['srv'],
  tenantId: string,
  parentId: string,
  opts: { resend?: boolean } = {},
): Promise<ProvisionResult> {
  const { data: parent, error } = await sb
    .from('parents')
    .select('id, full_name, phone, national_id, auth_email, sms_consent, profile_id')
    .eq('id', parentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error || !parent) return { ok: false, message: 'Parent not found.' };

  const nationalId = parent.national_id?.trim();
  if (!nationalId) return { ok: false, message: 'National ID is required to provision a parent login.' };
  if (!parent.phone?.trim()) return { ok: false, message: 'Phone number is required to provision a parent login.' };

  const authEmail = parent.auth_email?.trim() || makeParentAuthEmail(nationalId);
  const normPhone = normalizePhone(parent.phone);

  // Already provisioned and nothing was requested → nothing to do.
  if (parent.profile_id && !opts.resend) {
    return { ok: true, created: false, smsSent: false, message: 'Parent login already provisioned.' };
  }

  let userId = parent.profile_id ?? null;
  let created = false;
  if (!userId) {
    const existing = await findAuthUserByEmail(sb, authEmail);
    if (existing?.id) {
      userId = existing.id;
    } else {
      const { data: authUser, error: createErr } = await sb.auth.admin.createUser({
        email: authEmail,
        password: normPhone,
        email_confirm: true,
        user_metadata: {
          full_name: parent.full_name,
          national_id: nationalId,
          phone: parent.phone,
          provisioned_at: new Date().toISOString(),
        },
      });
      if (createErr) {
        if (/already.*registered|user_already_exists|duplicate/i.test(createErr.message)) {
          const found = await findAuthUserByEmail(sb, authEmail);
          if (!found?.id) return { ok: false, message: 'Provisioning failed: a login account already exists for this National ID.' };
          userId = found.id;
        } else {
          logError('parent_provision_create_user', createErr, { parentId });
          return { ok: false, message: 'Failed to create the parent login account.' };
        }
      } else {
        userId = authUser.user.id;
        created = true;
      }
    }
  }

  // Always re-arm the password to the current phone: on first create this sets
  // it; on resend/phone-edit it keeps the account in sync with the SMS.
  const { error: pwdErr } = await sb.auth.admin.updateUserById(userId, { password: normPhone });
  if (pwdErr) logError('parent_provision_password', pwdErr, { parentId, userId });

  await ensureAppRows(sb, tenantId, userId, parent, authEmail, nationalId);

  const smsSent = await enqueueLoginSms(sb, tenantId, parent, nationalId, normPhone);

  return {
    ok: true,
    created,
    smsSent,
    message: smsSent
      ? 'Parent login created and credentials sent by SMS.'
      : 'Parent login created. Login SMS was not queued (check SMS consent or the parent-provision SMS toggle).',
  };
}