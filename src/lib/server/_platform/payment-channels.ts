// Per-domain payment channel resolution (Payment Platform v2).
// A tenant sets ONE payment type per domain: bank (KCB) OR mpesa (paybill).
// Defaults: school → bank, remedial → mpesa.

export type PaymentChannel = 'bank' | 'mpesa';

export async function getPaymentChannels(
  srv: App.Locals['srv'],
  tenantId: string,
): Promise<{ school: PaymentChannel; remedial: PaymentChannel }> {
  const { data } = await srv
    .from('tenants')
    .select('school_payment_channel, remedial_payment_channel')
    .eq('id', tenantId)
    .single();

  return {
    school: (data?.school_payment_channel as PaymentChannel) ?? 'bank',
    remedial: (data?.remedial_payment_channel as PaymentChannel) ?? 'mpesa',
  };
}

export function channelForDomain(
  channels: { school: PaymentChannel; remedial: PaymentChannel },
  domain: 'school' | 'remedial',
): PaymentChannel {
  return domain === 'school' ? channels.school : channels.remedial;
}
