import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const callback = readFileSync(
  join(process.cwd(), 'supabase', 'functions', 'mpesa-callback', 'index.ts'),
  'utf8',
);

describe('M-Pesa callback safety contract', () => {
  it('fails closed when the callback secret is missing or wrong', () => {
    // Secret resolved via platform config (DB), env fallback; still fail-closed.
    expect(callback).toContain('getPlatformConfig');
    expect(callback).toContain("if (!callbackSecret)");
    expect(callback).toContain('verifySecret');
  });

  it('rejects missing or mismatched phone numbers', () => {
    expect(callback).toContain('!expectedPhone || !actualPhone || expectedPhone !== actualPhone');
  });

  it('uses a deterministic notification id and ignores duplicate inserts', () => {
    expect(callback).toContain('mpesa-receipt:${relatedId}');
    expect(callback).toContain("error.code !== '23505'");
  });

});
