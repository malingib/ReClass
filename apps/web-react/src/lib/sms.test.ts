import { describe, expect, it } from 'vitest';
import { normalizePhone, buildSmsPreview, buildMobiwaveV3Payload } from '@/lib/sms';

describe('normalizePhone', () => {
  it('keeps 254 numbers', () => {
    expect(normalizePhone('254700000000')).toBe('254700000000');
  });
  it('converts 07… to 254…', () => {
    expect(normalizePhone('0700000000')).toBe('254700000000');
  });
  it('strips spaces and plus', () => {
    expect(normalizePhone('+254 700 000 000')).toBe('254700000000');
  });
  it('returns empty for blank', () => {
    expect(normalizePhone('')).toBe('');
  });
});

describe('buildSmsPreview', () => {
  it('renders fee_due template', () => {
    const msg = buildSmsPreview('fee_due', { studentName: 'Amina', amount: '500', deadline: 'Friday' });
    expect(msg).toContain('Amina');
    expect(msg).toContain('500');
  });
});

describe('buildMobiwaveV3Payload', () => {
  it('matches Mobiwave v3 shape (recipient/sender_id/type/message)', () => {
    const p = buildMobiwaveV3Payload('0700000000', 'ESHULE', 'Hello');
    expect(p).toEqual({ recipient: '254700000000', sender_id: 'ESHULE', type: 'plain', message: 'Hello' });
    expect(p).not.toHaveProperty('mobile');
    expect(p).not.toHaveProperty('service_id');
  });
});
