import { beforeEach, describe, it, expect } from 'vitest';
import { getEnabledModules, invalidateModuleCache } from '../server/_platform/modules';

type Row = { module_id: string; enabled: boolean };

function fakeDb(rows: Row[], calls: { count: number } = { count: 0 }) {
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            abortSignal: async () => {
              calls.count++;
              return { data: rows, error: null };
            },
          }),
        }),
      }),
    }),
  };
  return { db: db as unknown as Parameters<typeof getEnabledModules>[0], calls };
}

beforeEach(() => invalidateModuleCache());

describe('getEnabledModules (Phase 3 semantics)', () => {
  it('lets super_admin see everything without a query', async () => {
    const { db, calls } = fakeDb([]);
    await expect(getEnabledModules(db, 't1', 'super_admin')).resolves.toBeNull();
    expect(calls.count).toBe(0);
  });

  it('fails open to null only when the tenant has zero rows (never provisioned)', async () => {
    const { db } = fakeDb([]);
    await expect(getEnabledModules(db, 't1', 'school_admin')).resolves.toBeNull();
  });

  it('honors an all-disabled tenant: returns [] (nothing enabled — no implicit fail-open)', async () => {
    const { db } = fakeDb([
      { module_id: 'remedial', enabled: false },
      { module_id: 'finance', enabled: false },
    ]);
    await expect(getEnabledModules(db, 't1', 'school_admin')).resolves.toEqual([]);
  });

  it('returns only enabled ids when rows exist', async () => {
    const { db } = fakeDb([
      { module_id: 'remedial', enabled: true },
      { module_id: 'finance', enabled: false },
      { module_id: 'reports', enabled: true },
      { module_id: 'sis', enabled: true },
    ]);
    await expect(getEnabledModules(db, 't1', 'school_admin')).resolves.toEqual(['remedial', 'reports', 'sis']);
  });

  it('returns module ids verbatim (no legacy reclass→remedial normalization)', async () => {
    // The rename migration (20260807000001) has been applied and live
    // tenant_modules holds only canonical ids ('remedial', not 'reclass').
    // getEnabledModules must therefore pass ids through unchanged — the DB is
    // the single source of truth. A legacy 'reclass' row would surface as-is,
    // which is exactly why the migration must stay applied.
    const { db } = fakeDb([
      { module_id: 'remedial', enabled: true },
      { module_id: 'finance', enabled: true },
    ]);
    await expect(getEnabledModules(db, 't1', 'school_admin')).resolves.toEqual(['remedial', 'finance']);

    // Disabled rows stay filtered out.
    const second = fakeDb([
      { module_id: 'remedial', enabled: false },
      { module_id: 'finance', enabled: false },
    ]);
    await expect(getEnabledModules(second.db, 't2', 'school_admin')).resolves.toEqual([]);
  });

  it('caches per tenant (no repeat query) and invalidates on toggle', async () => {
    const { db, calls } = fakeDb([{ module_id: 'remedial', enabled: true }]);
    await getEnabledModules(db, 't1', 'school_admin');
    await getEnabledModules(db, 't1', 'school_admin');
    expect(calls.count).toBe(1);

    // Different tenants never share a cache entry.
    const second = fakeDb([{ module_id: 'finance', enabled: false }]);
    await getEnabledModules(second.db, 't2', 'school_admin');
    expect(calls.count).toBe(1);

    invalidateModuleCache('t1');
    await getEnabledModules(db, 't1', 'school_admin');
    expect(calls.count).toBe(2);
  });
});
