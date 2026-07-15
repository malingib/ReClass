# ReClass — Testing Strategy (Section 23)

## Layers
1. **Unit** (Vitest): services (stk, scheduler, attendance, notification), validation (Zod schemas), pure functions (conflict detect, reconciliation math). Coverage gate ≥ 80% on `lib/` and services.
2. **Integration** (Supabase test project): RLS policies (cross-tenant leak test = critical), CRUD via PostgREST, triggers (amount_paid maintenance), migration apply.
3. **E2E** (Playwright): key flows — login→role route; teacher mark attendance→lock→parent SMS; parent pay via STK (sandbox)→ledger updates; admin bulk-import; bursar waiver. Run on staging pre-prod.
4. **Performance** (k6): STK endpoint (100 req/min), report export (1 term), dashboard load (p95 < 2s). Baselines at 1k/10k rows.
5. **Security**: OWASP ZAP baseline scan; `npm audit`; dependency review; RLS leak test in CI.
6. **Accessibility**: axe-core + Lighthouse CI (WCAG AA gate); manual screen-reader pass (VoiceOver/NVDA) on core pages.
7. **UAT**: 1-week pilot at Malingi with 3 teachers, 10 parents, bursar; feedback log → fixes.

## Test Data & Environments
- Seed script creates 2 tenants (Malingi + dummy) to prove isolation in integration tests.
- Faker-generated students/teachers; M-Pesa sandbox credentials for payment E2E.

## CI Gating
- PR blocks merge if: unit < 80% coverage, any integration/RLS test fails, ZAP high/critical, Lighthouse a11y < 90.
- E2E nightly on staging (not per-PR — speed).

## Representative Test Cases
- TC-ATT-01: teacher marks present → saved; after lock → 409 on edit without reason.
- TC-ATT-02: absent student → notification queued; parent receives SMS (mock gateway).
- TC-PAY-01: STK success → invoice paid, ledger + receipt, SMS confirmation.
- TC-PAY-02: amount > balance → 422 OVERPAYMENT.
- TC-PAY-03: duplicate callback (same CheckoutRequestID) → no double credit (idempotent).
- TC-RLS-01: tenant A user query returns zero rows for tenant B (leak test).
- TC-AUTH-01: 5 failed logins → lockout + CAPTCHA.
- TC-SCHED-01: double-book room → warning; admin override with reason → stored.
- TC-CRED-01: tenant admin saves Daraja creds → encrypted; `/credentials` list never returns `encrypted_blob`.
- TC-CRED-02: `resolve(tenant, mpesa)` returns tenant `school_send` prod → (absent) tenant sandbox → (absent) `CREDS_NOT_FOUND` — NOT the owner's `platform_billing` creds.
- TC-CRED-02b: owner-scoped platform job with `super_admin` context uses `platform_billing` creds and sends only platform/billing notices, never tenant messages.
- TC-CRED-03: non-super_admin cannot read/modify `scope=platform` creds (403).
- TC-CRED-04: `POST /credentials/:id/test` with bad token → `test_status=failed`; cannot activate until `ok`.
- TC-SEC-01: `decrypt_credential()` never invoked in client context; plaintext absent from any API response.
