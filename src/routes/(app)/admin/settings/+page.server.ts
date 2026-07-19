import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { logError } from '$lib/server/log';

export const load: PageServerLoad = async ({ locals }) => {
  const sb = locals.srv;
  const tid = locals.tenantId;
  if (!tid) {
    return { tenant: null, error: 'No tenant association found. Please contact support.' };
  }
  const { data: tenant } = await sb
    .from('tenants')
    .select('id, name, logo_url, brand_primary, mpesa_shortcode, mpesa_paybill, academic_year, timezone, currency, payroll_rate_per_session, settings')
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
    },
  };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const sb = locals.srv;
    const form = await request.formData();

    const name = form.get('name') as string;
    const logo_url = form.get('logo_url') as string;
    const brand_primary = form.get('brand_primary') as string;
    const academic_year = form.get('academic_year') as string;
    const mpesa_shortcode = form.get('mpesa_shortcode') as string;
    const mpesa_paybill = form.get('mpesa_paybill') as string;
    const timezone = form.get('timezone') as string;
    const currency = form.get('currency') as string;
    const payroll_rate_per_session = parseFloat(form.get('payroll_rate_per_session') as string) || 0;

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
