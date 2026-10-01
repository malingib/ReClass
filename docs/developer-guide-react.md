# eShule Developer Guide — React Vite App (`apps/web-react`)

> Audience: developers working on the React Vite SPA + Supabase backend.
> Binding stack decision: `docs/adr-001-frontend-and-deployment.md` (Vite + React + Vercel + Supabase).
> Companions: `docs/architecture-react.md` (system), `docs/api-react.md` (contracts), `docs/database-react.md` (schema/RLS).
> Historical `docs/` files may be stale; current code + these three docs win on conflict.

## 1. Prerequisites + setup

Requirements: Node.js `22.x` (`>=22 <23`), npm, Supabase CLI (migrations/Edge), Playwright Chromium (E2E).

```bash
nvm use
node --version            # expect v22.x
npm ci                    # clean install from lockfile (use for CI repro)
cp .env.example .env      # root secrets template — local/sandbox values only
cp apps/web-react/.env.example apps/web-react/.env
supabase start            # local Supabase (DB + Auth + Edge runtime)
```

Workspace commands (run from repo root, targeting the `web-react` workspace):

```bash
npm run dev --workspace @eshule/web-react        # vite dev server (:5173)
npm run lint --workspace @eshule/web-react       # eslint src
npm run typecheck --workspace @eshule/web-react  # tsc --noEmit (authoritative type gate)
npm run test --workspace @eshule/web-react       # vitest run
npm run build --workspace @eshule/web-react      # tsc --noEmit && vite build
```

Key config: `apps/web-react/package.json` (React 18, Vite 6, react-router-dom 7, TanStack Query 5,
RHF + Zod, recharts, `@sentry/react`, Tailwind 4), `vite.config.ts` (`@` → `src`, `dist` output),
`tsconfig.json` (strict, `noEmit`, `@/*` paths), `vitest.config.ts` (`src/**/*.{test,spec}`),
root `eslint.config.*`, `vercel.json` (SPA rewrite `/(.*) → /index.html`).

Never use production credentials or real school/customer data in dev or tests. Never commit
`service_role` keys, M-Pesa/Mobiwave secrets, callback secrets, or Sentry auth tokens.

### Environment variables

`apps/web-react/.env` (browser, `VITE_` prefix = public):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (local: `http://127.0.0.1:54321`) |
| `VITE_SUPABASE_ANON_KEY` | Browser anon key — never `service_role` |
| `VITE_SENTRY_DSN` | Optional browser Sentry integration |

Root `.env` + Edge secrets (server-only, never `VITE_`): `SUPABASE_SERVICE_ROLE_KEY`,
`MPESA_CALLBACK_SECRET` / `x-callback-secret` platform config, `MOBIWAVE_BASE`, Daraja
credentials per tenant (via `credentials` table + `resolve_credential`, not env files).
Keep tenant `school_send` credentials separate from platform billing credentials.

## 2. Repo map

| Path | Status | Contents |
|---|---|---|
| `apps/web-react/` | **active frontend** | `src/` (App, pages, hooks, components, lib, contexts, integrations), `vite.config.ts`, `vercel.json`, `e2e/`, workspace `package.json` |
| `apps/web-react/src/` | active code | `App.tsx` (~90 routes), `main.tsx`, `lib/rbac.ts`, `integrations/supabase/client.ts`, `contexts/AuthContext.tsx`, `hooks/`, `components/`, `pages/{admin,finance,reclass,parent,teacher,comms,sis,misc}` |
| `src/` (root, SvelteKit) | **frozen, reference-only** | old routes/loads/actions; do NOT add routes, loads, form actions, or CSV endpoints — `reports-csv` already replaced them |
| `supabase/` | active backend | `migrations/` (ordered SQL), `functions/` (`stk`, `mpesa-callback`, `reclass-mpesa-callback`, `notify`, `b2c`, `b2c-result`, `payroll-ops`, `reports-csv`, `sms-campaign`, `cleanup-pending-checkouts`, `_shared/`), `config.toml`, seeds |
| `e2e/` | legacy Playwright specs | root specs; React smoke spec lives at `apps/web-react/e2e/` |
| `scripts/` | tooling | audit/dev scripts (tenant-isolation checks, static scans) |
| `docs/` | reference | `architecture-react.md`, `api-react.md`, `database-react.md` are current; older files are traceability only |

New work lands in `apps/web-react/src` + `supabase/{migrations,functions}`. Deleting SvelteKit
code is a separate cleanup decision — until then it must not diverge from the React baseline.

## 3. Frontend conventions

- **Routes:** declare in `src/App.tsx` via `shell(roles, el, perms?)`, which wraps every page in
  `ProtectedRoute + AuthenticatedLayout`. Coarse gate = role group (`ADMIN_ROLES`, `FINANCE_ROLES`,
  `RECLASS_*_ROLES`, …); fine gate = `PERMISSIONS.*` codes on ReClass routes.
- **Guards:** `components/ProtectedRoute.tsx` checks session → `user_roles` → active role ∈
  `allowedRoles`, then `role_permissions → permissions.code` with `.some()` semantics
  (`super_admin` bypass). `useAuthorization()` exposes `hasRole`/`hasPermission` for in-page gating.
  Client gating is UX only — every mutation is re-authorized server-side.
- **Roles/permissions:** single source is `lib/rbac.ts` — 12 roles, `roleHome`, `PERMISSIONS`
  (`school.finance.*`, `reclass.{programme,teaching,attendance,committee,finance,payments}.*`,
  `users.manage`, `settings.manage`, `audit.view`), role-group constants, `eshule_active_role`
  storage helpers. Add new permission codes here first.
- **Data:** TanStack Query hooks in `hooks/` (`useTenant`, `useFinance`, `useRemedial`,
  `useDashboard`, `useStudents`, `useParentScope`). Query keys always carry tenant context:
  `['school-context']` (60 s stale), `['students', tenantId, page, search]`,
  `['fee-types']`, `['payroll-runs', kind]`, `['attendance', …]`. Invalidate on mutation
  (`qc.invalidateQueries`), on role switch (`['tenant-context']`), `qc.clear()` on logout.
- **Forms:** React Hook Form + Zod via `@hookform/resolvers`. Client schema is fast feedback;
  server/Edge re-validates everything.
- **Styling:** Tailwind 4 + design tokens only — no hardcoded hex colors. Shared UI in
  `components/` (`DataTable`, `KpiCard`, `ui.tsx`, `TrendChart`, `FeeManager`, `PayrollPanel`,
  `ReceiptModal`, `SmsComposer`, `NotificationBell`, `ConfirmDelete`). Icons: Lucide (`lucide-react`).
- **Feedback/resilience:** Sonner toasts for user feedback; `ErrorBoundary.tsx` at the App root
  (route-level crash containment); `Suspense` fallback for lazy routes.
- **Auth context:** `contexts/AuthContext.tsx` is thin — `logout()` (signOut → clear role →
  `qc.clear()` → `/login`), `switchRole(role, held)` (guard, persist, invalidate, `roleHome` nav).
- **Theme/tokens:** `context/theme-provider.tsx` + `index.css` own Tailwind 4 tokens; pages
  consume tokens, never raw values.

Example — new guarded route plus tenant-scoped, paged query:

```tsx
// App.tsx
<Route path="/admin/my-queue" element={shell(MEMBER_MANAGEMENT_ROLES, <MyQueue />)} />
// ReClass route with fine permission gate:
<Route path="/admin/my-committee" element={shell(RECLASS_COMMITTEE_ROLES, <MyCommittee />,
  [PERMISSIONS.reclassCommittee.view])} />
```

```ts
// hooks/useMyQueue.ts — tenant scoping + keyset pagination pattern
export function useMyQueue(cursor?: string) {
  const { data: ctx } = useTenant();
  return useQuery({
    queryKey: ['my-queue', ctx?.tenantId, cursor],
    enabled: !!ctx?.tenantId,
    queryFn: async () => {
      let q = supabase.from('my_table').select('*')
        .eq('tenant_id', ctx!.tenantId)
        .order('created_at', { ascending: false }).limit(50);
      if (cursor) q = q.lt('created_at', cursor);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
```

```ts
// Privileged mutation via Edge (never direct write on money tables)
const { data, error } = await supabase.functions.invoke('payroll-ops', {
  body: { op: 'approve', kind: 'remedial', id: runId },
});
```

```tsx
// Form validation: RHF + Zod
const schema = z.object({ name: z.string().min(1), amount: z.number().positive() });
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

## 4. Data conventions

- **Browser client is anon-key only** (`integrations/supabase/client.ts`): never throws at import,
  warns without env. `service_role` exists only inside Edge Functions.
- **Tenant scoping on every query:** always `.eq('tenant_id', ctx.tenantId)` plus
  `.is('deleted_at', null)` where the table is soft-deleted (`fee_types`, `students`).
  Never accept a request field as tenant authority — derive from the verified session.
- **No `service_role` in the browser.** Privileged transitions go through RPC or Edge:
  `reconcile_payment`, `grant_waiver`, `claim_payroll_run`, `finalize_payroll_b2c`,
  `claim_notifications`, `resolve_credential`/`decrypt_tenant_credential` (all `service_role`-only).
- **RPC over raw writes for money.** Browser never hand-writes `payments`, `payroll_runs`
  transitions, or credential material. STK → `stk` Edge; callbacks → `reconcile_payment`;
  payroll generate/approve/mark-paid → `payroll-ops` Edge; B2C payout → `b2c`/`b2c-result`.
- **Keyset pagination first:** `.order('created_at', { ascending: false })` +
  `.lt('created_at', cursor)` + `.limit(n)` on hot tables (`payments`, `students`,
  `teacher_attendance`, `notifications`, `payroll_runs`). Else `.range(from, to)`.
  PostgREST caps at 1000 rows — never rely on unbounded `.select()`. CSV export
  (`reports-csv`, 5000-row cap) is the bulk escape hatch, not a paging substitute.
- **Deterministic ids:** receipt numbers `RCP-<TENANT6>-<YYYYMMDD>-<CHECKOUT5>` (retries can't
  mint duplicates); notification `external_id` per event (`mpesa-receipt:{id}`,
  `b2c-paid:{run_id}`, `teacher-task-reminder:{task_id}`); `b2c_checkout_id` minted inside
  `claim_payroll_run`. Pre-insert existence check + swallow `23505` on enqueue paths.

## 5. Edge Function conventions

Location: `supabase/functions/<name>/index.ts` + `supabase/functions/_shared/`
(`auth.ts`: `verifyAuth`/`verifyAdmin`/`verifySecret`; `response.ts`: `{ error: CODE }` shape;
`supabase.ts`: `getUserClient`/`getServiceClient`).

- **Reuse `_shared/`** for auth, response codes, and client construction — no per-function copies.
- **Callbacks are POST-only** (`mpesa-callback`, `reclass-mpesa-callback`, `b2c-result`,
  `cleanup-pending-checkouts`): non-POST → `405`. Treat callbacks/jobs as retryable and duplicated.
- **10 KB body cap** on Daraja callbacks: enforce on `content-length` AND actual bytes
  (`TextEncoder().encode(raw).length`); over → `400 body_too_large`.
- **Fail-closed secrets:** `x-callback-secret` via constant-time `verifySecret`; missing secret →
  `500` (no unauthenticated processing), mismatch → `401`. `service_role`-gated workers
  (`notify`, `b2c`) exact-match the service key. Never fall back to platform credentials for tenants.
- **Safe logs:** prefix with `[stk]|[b2c]|[mpesa-callback]`; log ids and operational context only.
  Redact bearer/api tokens in `last_error`; never log secrets, full phone numbers, or student PII.
- **Amount/phone binding:** STK fast path compares callback `Amount` exactly and digit-normalized
  phone; mismatch → mark `failed` + `409`. Unroutable money parks in `unmatched_payments`
  (bursar queue) — never force-attribute.
- **User-JWT functions** (`stk`, `payroll-ops`, `reports-csv`, `sms-campaign`): `verifyAuth` →
  resolve tenant from `user_roles` grant → per-op role check → tenant-scoped queries.

## 6. Migration conventions

- **Forward-only, timestamped** SQL under `supabase/migrations/`. Never edit applied/shared
  migrations. Rehearse against clean AND production-like upgrade states.
- **Expand-contract** for breaking changes: add nullable → backfill → enforce → drop.
- **Idempotent DDL:** `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` where safe; record heavy
  `CREATE INDEX CONCURRENTLY` out-of-band work idempotently.
- **No destructive finance cascades:** ledger parents (`students → invoices → payments/waivers`,
  `payroll_runs`, `audit_log`) use `RESTRICT`, never cascade payment evidence away.
  Prefer `deleted_at` soft-delete; never hard-delete rows referenced by `payments`/`audit_log`.
- **Composites for tenant FKs:** add `UNIQUE (tenant_id, id)` on tenant-scoped parents and
  repoint children to `FOREIGN KEY (tenant_id, parent_id) REFERENCES parent(tenant_id, id)`
  so cross-tenant inserts fail in the DB (`DATABASE.md §4`, `database-react.md §4`).
- **Hygiene:** fixed `search_path` + least-privilege grants on functions; `SECURITY DEFINER`
  reviewed; `REVOKE … FROM anon, authenticated` except explicitly granted RPCs;
  regenerate DB types only from the successfully migrated schema.

Example — idempotent tenant table with RLS:

```sql
create table if not exists public.my_table (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.my_table enable row level security;
drop policy if exists tenant_read on public.my_table;
create policy tenant_read on public.my_table for select to authenticated
  using (tenant_id in (select tenant_ids_for_user()));
drop policy if exists tenant_write_staff on public.my_table;
create policy tenant_write_staff on public.my_table for all to authenticated
  using (tenant_id in (select tenant_ids_for_user()))
  with check (tenant_id in (select tenant_ids_for_user()));
```

## 7. Checks (run before every PR)

```bash
npm run lint --workspace @eshule/web-react
npm run typecheck --workspace @eshule/web-react
npm run test --workspace @eshule/web-react
npm run build --workspace @eshule/web-react
supabase db reset --local            # migration replay, twice from zero
supabase db execute --local -f <cross-tenant-check.sql>
npx playwright test                  # needs non-prod env; not a substitute for unit checks
```

What each gate proves: lint (style/unused), typecheck (`tsc --noEmit`, authoritative),
vitest (tenant denial, RBAC, reconcile replay, payroll uniqueness, notify idempotency),
build (Vite bundle), migration replay (forward-only + upgrade-state safety), cross-tenant
checks (user A selecting/inserting tenant B rows → 0 rows / 42501; FK-drift queries in
`database-react.md` appendix return zero). Record commands + results in the PR; document any
skipped gate (E2E, backup drill, Daraja sandbox) as an explicit gap.

### Testing expectations (per `CONTRIBUTING.md` + `docs/testing.md`)

Add tests for every change touching: tenant isolation / cross-tenant denial, capability and
committee authorization, payment reconcile + callback replay, payroll period uniqueness and
approval separation, receipt evidence integrity, notification retry/idempotency, migrations and
RPCs/triggers, and critical teacher/parent/bursar/principal/admin/ReClass journeys.
Unit/integration live in `src/**/*.{test,spec}.{ts,tsx}` (vitest, node env); browser E2E via
`apps/web-react/playwright.config.ts` + `e2e/smoke.spec.ts` against a dedicated non-production
environment — never production. Keyboard/accessibility + responsive checks for material UI changes.

### PR checklist (minimum)

- [ ] `npm ci` + Node 22 clean verification; lint, typecheck, test, build green
- [ ] No secrets or unredacted PII in diff, logs, or artifacts
- [ ] Browser/server boundary correct (no `service_role` in `apps/web-react`)
- [ ] Tenant scoping on every new query; cross-tenant negative test included
- [ ] Financial paths idempotent + audited; migrations forward-only and replayed
- [ ] Docs updated (`architecture-react` / `api-react` / `database-react` as affected)

## 8. Common tasks

**Add a route + permission** — touchpoints: `lib/rbac.ts` (code or role group) →
`App.tsx` (`shell(GROUP, <Page/>, [PERMISSIONS.x.y])`) → `components/layout/nav-data.ts`
(nav entry, `filterNavByRole`) → `pages/<domain>/` (thin page, data via hook) →
`ProtectedRoute` needs no change. Test: allowed role renders, denied role → `/login`.

**Add a table + RLS** — touchpoints: `supabase/migrations/<ts>_*.sql` (table, `tenant_id NOT NULL
REFERENCES tenants`, uniques/checks, composite `UNIQUE (tenant_id, id)` where parented,
`tenant_read`/`tenant_write_staff` via `tenant_ids_for_user()`, no anon policy) →
hook in `hooks/` (tenant-scoped + paged query) → page wiring. Test: cross-tenant negative
(select/insert tenant B → denied) + drift query returns zero.

**Add an Edge Function** — touchpoints: `supabase/functions/<name>/index.ts` (POST-only where
callback, 10 KB cap, `verifyAuth` or secret/service gate, tenant-from-grant, `{ error: CODE }`
errors) → reuse `_shared/` → browser calls via `supabase.functions.invoke('<name>', { body })`
in a hook mutation with `qc.invalidateQueries`. Test: 401/403 paths, replay/idempotency,
safe-error shape (no secret leakage).

**Add a notification template** — touchpoints: enqueue site (Edge/RPC inserting
`notifications{tenant_id, channel, recipient, body, template, status:'queued',
external_id}` with deterministic dedupe key + `tenant_setting_enabled` toggle check) →
delivery stays in `notify` (no per-domain sender) → inbox reads live via `NotificationBell`.
Test: double-enqueue → one send; `MAX_ATTEMPTS = 3`, backoff 1/5/30 min; unsupported channel →
`failed`, not silent drop.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Query returns 0 rows, no error | RLS claim miss (`tenant_ids_for_user()` empty) or missing `.eq('tenant_id', …)` / stale `['school-context']` after role switch | verify `user_roles` grant exists; add tenant filter; `qc.invalidateQueries({ queryKey: ['tenant-context'] })`; check `pg_policies` for `tenant_read` on the table |
| STK `429 DUPLICATE_REQUEST` | pending `checkout_requests` row for `(tenant_id, student_id, fee_type_id)` or partial-unique race | intended guard — surface "payment already in progress"; bursar checks pending queue; `cleanup-pending-checkouts` fails stale (>30 min) rows |
| Callback `amount_mismatch` / `phone_mismatch` (409) | Daraja `Amount` ≠ checkout amount, or digit-normalization drift | compare exact amount + normalized digits; mark `failed` with reason; reconcile manually via bursar queue, never force-fit |
| Callback `unmatched_admission` / `missing_bill_ref` | manual paybill with unknown/empty `BillRefNumber` | parked in `unmatched_payments` (service-role triage) → bursar matches; fix sender instructions, not the matcher |
| Query cache stale after mutation/role change | missing invalidation | `onSuccess: () => qc.invalidateQueries({ queryKey: [...] })`; role switch invalidates `['school-context']`; logout does `qc.clear()` |
| `401 UNAUTHORIZED` from Edge | missing/invalid Bearer JWT or service-role gate hit from browser | send `Authorization: Bearer <jwt>`; scheduler-only functions (`notify`, `b2c`) are never called from the browser |
| `BANK_CHANNEL` / `CREDS_NOT_FOUND` on STK | tenant `school|remedial_payment_channel ≠ mpesa`, or no active `school_send` credential | set tenant channel; provision tenant credential via `resolve_credential` path (never platform fallback) |
| `INVALID_TRANSITION` / `TRANSITION_FAILED` (payroll) | wrong `draft → approved → paid` order or lost compare-and-set race | re-read run state; only generate (admin), approve (admin/principal), mark-paid (admin/bursar); retry on 409 after refresh |

Still stuck? Capture: route + active role, query key, `tenant_id` used, Edge `{ error: CODE }`,
and redacted server log prefix — then open an issue with synthetic data only.
