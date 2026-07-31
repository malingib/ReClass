import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

function sql(name: string) {
  return readFileSync(join(migrationsDir, name), 'utf8');
}

// Deprecated invoice-lifecycle objects. They may be CREATEd only in the historical
// migrations that existed before the prune, and must be DROPPed by 000003. No later
// migration may re-CREATE them.
const DEPRECATED = ['invoices', 'teacher_invoices', 'waivers', 'payment_reconciliations'];

describe('schema prune regression guard (invoice lifecycle removed)', () => {
  it('000003 drops all deprecated tables', () => {
    const m = sql('20260731000003_prune_invoice_artifacts.sql');
    for (const t of DEPRECATED) {
      expect(m, `migration must DROP ${t}`).toMatch(
        new RegExp(`DROP TABLE IF EXISTS (public\\.)?${t}\\b`, 'i')
      );
    }
  });

  it('000003 removes the payment->invoice trigger and its function', () => {
    const m = sql('20260731000003_prune_invoice_artifacts.sql');
    expect(m).toMatch(/DROP TRIGGER IF EXISTS trg_payment_after_insert/i);
    expect(m).toMatch(/DROP FUNCTION IF EXISTS public\.update_invoice_on_payment/i);
  });

  it('000001 drops the grant_waiver RPC', () => {
    const m = sql('20260731000001_drop_invoice_lifecycle.sql');
    expect(m).toMatch(/DROP FUNCTION IF EXISTS public\.grant_waiver/i);
  });

  for (const t of DEPRECATED) {
    it(`no migration after 000003 re-creates ${t}`, () => {
      const later = files.filter(
        (f) => f > '20260731000003' && /create table/i.test(sql(f))
      );
      for (const f of later) {
        expect(sql(f), `migration ${f} must not recreate ${t}`).not.toMatch(
          new RegExp(`create table[^;]*\\b${t}\\b`, 'i')
        );
      }
    });
  }

  it('deprecated tables are only CREATEd in pre-prune historical migrations', () => {
    for (const t of DEPRECATED) {
      const creators = files.filter((f) => /create table/i.test(sql(f)) && sql(f).match(new RegExp(`create table[^;]*\\b${t}\\b`, 'i')));
      // Allowed creators: the original core/teacher_invoices migrations (pre-000003).
      for (const c of creators) {
        expect(c < '20260731000003', `${c} creates ${t} but is not before the prune migration`).toBe(true);
      }
      expect(creators.length).toBeGreaterThan(0); // they were created at some point (history)
    }
  });
});
