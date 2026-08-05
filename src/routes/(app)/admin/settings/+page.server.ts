import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { logError } from '$lib/server/_platform/log';

export const load: PageServerLoad = async ({ locals }) => {
  const sb = locals.srv;
  const tid = locals.tenantId;
  if (!tid) {
    return { tenant: null, error: 'No tenant association found. Please contact support.' };
  }
  const { data: tenant } = await sb
    .from('tenants')
    .select('id, name, logo_url, brand_primary, mpesa_shortcode, mpesa_paybill, academic_year, timezone, currency, payroll_rate_per_session, settings, school_payment_channel, remedial_payment_channel, kcb_account_no, kcb_bank_name, buni_shortcode')
    .eq('id', tid)
    .single();

  return {
    tenant: tenant ?? {
      name: '',
      logo_url: '',
      brand_primary: '#12b76a',
      mpesa_shortcode: '',
      mpesa_paybill: '',
      academic_year: '',
      timezone: 'Africa/Nairobi',
      currency: 'KES',
      payroll_rate_per_session: 0,
      settings: {},
      school_payment_channel: 'bank',
      remedial_payment_channel: 'mpesa',
      kcb_account_no: '',
      kcb_bank_name: 'KCB',
      buni_shortcode: '',
    },
  };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const sb = locals.srv;
    const form = await request.formData();

    const name = String(form.get('name') ?? '');
    const logo_url = String(form.get('logo_url') ?? '');
    const brand_primary = String(form.get('brand_primary') ?? '');
    const academic_year = String(form.get('academic_year') ?? '');
    const mpesa_shortcode = String(form.get('mpesa_shortcode') ?? '');
    const mpesa_paybill = String(form.get('mpesa_paybill') ?? '');
    const timezone = String(form.get('timezone') ?? '');
    const currency = String(form.get('currency') ?? '');
    const payroll_rate_per_session = parseFloat(String(form.get('payroll_rate_per_session') ?? '0')) || 0;
    const school_payment_channel = String(form.get('school_payment_channel') ?? 'bank') === 'mpesa' ? 'mpesa' : 'bank';
    const remedial_payment_channel = String(form.get('remedial_payment_channel') ?? 'mpesa') === 'mpesa' ? 'mpesa' : 'bank';
    const kcb_account_no = String(form.get('kcb_account_no') ?? '');
    const kcb_bank_name = String(form.get('kcb_bank_name') ?? 'KCB');
    const buni_shortcode = String(form.get('buni_shortcode') ?? '');

    // Settings JSONB — SMS toggles and other preferences
    const sms_attendance = form.get('sms_attendance') === 'on';
    const sms_payment_reminder = form.get('sms_payment_reminder') === 'on';
    const sms_payment_receipt = form.get('sms_payment_receipt') === 'on';

    const settings = {
      sms_attendance,
      sms_payment_reminder,
      sms_payment_receipt,
    };

    if (!name || name.trim().length === 0) {
      return fail(400, { error: 'School name is required' });
    }

    if (mpesa_shortcode && !/^\d{5,7}$/.test(mpesa_shortcode.trim())) {
      return fail(400, { error: 'M-Pesa shortcode must be a 5–7 digit number (e.g. 174379).' });
    }

    if (mpesa_paybill && !/^\d{5,7}$/.test(mpesa_paybill.trim())) {
      return fail(400, { error: 'M-Pesa paybill must be a 5–7 digit number.' });
    }

    const { error } = await sb
      .from('tenants')
      .update({
        name: name.trim(),
        logo_url: logo_url || null,
        brand_primary: brand_primary || '#12b76a',
        academic_year: academic_year || null,
        mpesa_shortcode: mpesa_shortcode || null,
        mpesa_paybill: mpesa_paybill || null,
        timezone: timezone || 'Africa/Nairobi',
        currency: currency || 'KES',
        payroll_rate_per_session,
        school_payment_channel,
        remedial_payment_channel,
        kcb_account_no: kcb_account_no || null,
        kcb_bank_name: kcb_bank_name || 'KCB',
        buni_shortcode: buni_shortcode || null,
        settings,
      })
      .eq('id', locals.tenantId);

    if (error) {
      logError('settings_save', error);
      return fail(500, { error: 'Failed to save settings. Please try again.' });
    }

    return { success: true };
  },
};
