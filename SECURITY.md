# ReClass Security Implementation Audit

**Audit date:** 2026-07-22  
**Scope:** repository implementation at `/home/malingi/Projects/Custom/ReClass`; no production penetration test or hosted Supabase configuration verification  
**Method:** manual code/configuration/migration review plus `npm audit --json` on 2026-07-22  
**Secret handling:** no secret values are reproduced in this report

## Executive assessment

ReClass has meaningful server-side role checks, tenant predicates, parent/teacher ownership helpers, payment/waiver RPC state controls, SSR auth-cookie handling, security headers, and constrained outbound destinations. Those controls are undermined by routine use of the Supabase service-role client, which bypasses RLS and turns every missing predicate into a potential cross-tenant defect.

The current build should not be released with live school credentials or high-integrity academic/payment administration until the release-blocking findings are resolved. The most urgent issue is that the credential UI labels plaintext input as encrypted but the server stores it directly in `encrypted_blob`. Academic result replacement also accepts unvalidated cross-tenant references and deletes existing results before a nontransactional insert. The callback trust model is optional, rate limiting is narrow and process-local, and audit coverage is far below the claims in `docs/security.md`.

## Threat model

### Assets

- Student and minor data: identity, admission number, grade, attendance, academic results.
- Parent/guardian identity, phone, email, consent state, child relationships, and messages.
- Teacher identity, schedules, attendance approvals, and payroll amounts/status.
- Invoices, waivers, payments, M-Pesa checkout/receipt data, and reconciliation integrity.
- Tenant isolation and school configuration.
- Supabase Auth sessions, refresh/access tokens, role assignments, and impersonation tokens.
- Supabase service-role key and tenant Daraja/Mobiwave credentials.
- Notification recipients/content and provider account balances.
- Audit evidence, Sentry telemetry, and operational availability.

### Actors and adversaries

- Unauthenticated internet attacker targeting SvelteKit, Supabase Auth, public PostgREST, or Edge Functions.
- Authenticated parent, teacher, bursar, principal, or school administrator exceeding intended authority.
- Compromised tenant administrator or browser session.
- Malicious/compromised super administrator.
- Forged/replayed M-Pesa callback sender.
- Cross-tenant attacker exploiting an omitted tenant/ownership predicate while the service-role client bypasses RLS.
- Supply-chain attacker through npm, Deno URL imports, GitHub Actions, or container dependencies.
- Operator error, leaked environment variables, or misconfigured hosted Supabase settings.

### Trust boundaries and flows

1. Browser to SvelteKit: Supabase SSR cookies and SvelteKit form actions/direct handlers.
2. SvelteKit to Supabase: both user-scoped Auth client and privileged service-role PostgREST/RPC client.
3. Browser or scheduler to Edge Functions: user JWT for `stk`/`credentials-test`; service-role bearer for workers; optional callback secret for M-Pesa.
4. Edge Functions to database: service-role client, bypassing RLS.
5. Edge Functions to Safaricom and Mobiwave: decrypted tenant credentials and PII leave the database boundary.
6. Application to Sentry: errors/traces may leave the primary hosting boundary when configured.
7. CSV/import boundary: untrusted spreadsheet/file content enters or leaves privileged administrative workflows.
8. Super-admin impersonation: signed cookie changes effective tenant while retaining super-admin authority.

### Security assumptions requiring deployment verification

- HTTPS terminates correctly before SvelteKit and Supabase; proxy client addresses are trustworthy.
- Hosted Supabase has the reviewed migrations, grants, Auth settings, function JWT settings, Vault secret, backups, and network controls applied.
- The production callback sender can supply the configured callback secret, or another authenticated gateway protects the callback.
- Public PostgREST table/function grants are narrower than or consistent with intended RLS policies.
- Environment values and deployment logs are access-controlled and rotated.

## Strong implemented controls

- `auth.getUser()` verifies the Supabase user rather than trusting cookie contents (`src/lib/server/middleware.ts:38-55`).
- Global route-to-role mapping and role layouts reject incorrect role prefixes (`src/lib/server/middleware.ts:102-136`, `src/routes/(app)/*/+layout.server.ts`).
- `requireUser`, `requireTenant`, `requireRole`, and `requireTenantRole` provide explicit server checks (`src/lib/server/auth.ts`).
- Parent and teacher pages require profile ownership links; STK verifies parent-to-student ownership (`src/lib/server/ownership.ts`, `supabase/functions/stk/index.ts:16-35`).
- Most service-role CRUD statements include `tenant_id` predicates, and foreign resources are checked in important paths such as invoices and schedules.
- RLS is enabled by migrations on core, credential, message, exam, and specialized tables. Sensitive RPC execution is revoked from `public`, `anon`, and `authenticated` for payment, attendance, and credential decryption functions (`supabase/migrations/20260720000002_enable_rls_policies.sql` and referenced specialized migrations).
- Payment initiation derives amount and phone server-side, pre-creates checkout tracking, checks parent ownership, and restricts invoice state (`supabase/functions/stk/index.ts`).
- `reconcile_payment` and `grant_waiver` are service-only, security-definer RPCs designed for atomic financial state changes (`supabase/migrations/20260720000004_fix_payment_and_waiver.sql`).
- Teacher marking and principal review use service-only RPCs with authoritative tenant/profile parameters (`src/routes/(app)/teacher/+page.server.ts`, `src/routes/(app)/principal/+page.server.ts`, `supabase/migrations/20260719000003_whole_class_delivery.sql`).
- Impersonation payloads are HMAC-SHA256 signed, expire after one hour, and bind an IP value (`src/lib/server/impersonation.ts`).
- Auth/user-display and impersonation cookies are HttpOnly and SameSite=Lax; the display cookie is also Secure (`src/lib/server/middleware.ts:55-59`).
- Svelte output escapes text by default. Existing `{@html}` calls render application-owned icon strings, not direct user values (`src/lib/components/layout/AppShell.svelte`).
- Database access uses Supabase query builders/RPCs rather than concatenated SQL. Dynamic SQL found in migrations uses fixed internal table names.
- Security response headers include HSTS, nosniff, SAMEORIGIN framing, and strict-origin-when-cross-origin referrer policy (`src/lib/server/middleware.ts:92-99`).
- Edge CORS is allowlisted for known UI origins; unrecognized origins are not reflected (`supabase/functions/_shared/cors.ts`).
- Credential resolution deliberately has no platform fallback for tenant sends (`supabase/migrations/20260713000002_credential_resolution.sql`).
- Notification exception text redacts bearer/token-shaped values before persistence (`supabase/functions/notify/index.ts:66-72`).
- The CSV encoder quotes fields and escapes quotes, preventing CSV structure break-out, though not spreadsheet formulas (`src/lib/server/csv.ts`).
- CI runs install, lint, typecheck, unit tests, and build on push/PR (`.github/workflows/ci.yml`).

## Prioritized findings

Severity reflects repository-level likelihood and impact, not a production CVSS calculation. “Exploit” describes the minimum credible path without including secret values.

### SEC-001: Credential plaintext is mislabeled and stored without encryption

**Severity:** Critical  
**Evidence:** `src/routes/(app)/admin/credentials/+page.svelte:139-150` asks the browser for JSON/API-token plaintext under `encrypted_blob` and says it will be encrypted. `src/routes/(app)/admin/credentials/+page.server.ts:11-20` forwards it unchanged. `src/lib/server/credentials.ts:25-35,37-53` writes it directly to `credentials.encrypted_blob`. `encrypt_credential` exists but is never called by this path (`supabase/migrations/20260713000001_credentials.sql:69-79`). In addition, `decrypt_credential` requires matching `app.tenant_id` or super-admin context (`supabase/migrations/20260713000001_credentials.sql:41-64`), while no Edge Function calls `set_tenant_context`; repository search found no such call under `supabase/functions`. STK therefore catches a decryption exception as `500`, credential testing returns `400 decrypt`, and notification delivery retries/fails under the reviewed migration state.  
**Exploit:** anyone obtaining database read access, backup access, SQL logs, service-role access, or an overbroad query can read live provider credentials as submitted. The broken encryption/context path also prevents legitimate payment and SMS operations.  
**Impact:** compromise of tenant payment/SMS accounts, fraudulent requests/messages, financial loss, breach notification exposure, false assurance to administrators, and production payment/notification outage.  
**Remediation:** accept a typed `secrets` structure over a protected action, validate per provider, immediately call a narrowly granted server-side encryption RPC, and store only returned ciphertext. Never name client input `encrypted_blob`. Replace connection-local authorization context with actor/tenant checks inside a narrow RPC or pass and verify tenant explicitly; do not rely on unestablished pooled-session settings. Do not return plaintext. Migrate/rotate all credentials ever saved through this implementation; do not merely encrypt existing values without provider rotation. Set `created_by`, activate only after a successful test, and add encryption/decryption/redaction integration tests.

### SEC-002: Service-role bypass is the default SvelteKit database access model

**Severity:** High  
**Evidence:** every request gets `locals.srv = getServiceClient()` (`src/lib/server/middleware.ts:27-36`); that client uses `SUPABASE_SERVICE_ROLE_KEY` and explicitly bypasses RLS (`src/lib/supabase/server.ts:21-25`). The RLS migration acknowledges this (`supabase/migrations/20260720000002_enable_rls_policies.sql:1-5`). Most page queries/actions use `locals.srv`.  
**Exploit:** find any action/query missing a tenant/ownership predicate or accepting a cross-tenant foreign key. Because RLS is bypassed, the database does not provide the claimed backstop. SEC-003 and SEC-005 are concrete examples of this failure mode.  
**Impact:** cross-tenant disclosure or mutation of student, financial, messaging, credential, or academic data; a single application bug becomes platform-wide.  
**Remediation:** use user-JWT clients and effective database authorization for ordinary requests. Put only narrowly scoped privileged operations behind security-definer RPCs that derive/check actor and tenant. If a backend role is required, create a restricted application DB role rather than using `service_role` universally. Add integration tests against a real database proving cross-tenant denial with attacker-controlled IDs. Treat every remaining service-role call as privileged code requiring explicit authorization review.

### SEC-003: Academic result replacement is unvalidated, cross-tenant-capable, and nontransactional

**Severity:** High  
**Evidence:** `src/routes/(app)/admin/academic/[examId]/edit/+page.server.ts:25-31` declares a schema but never uses it. Lines 34-62 parse arbitrary JSON, delete existing tenant results, and insert caller-provided student/subject IDs and score values. It does not verify that `params.examId`, student IDs, or subject IDs belong to the current tenant. The service-role client bypasses RLS. Delete and insert are separate operations.  
**Exploit:** a school admin submits IDs from another tenant (obtained through another weakness or disclosure), or malformed/duplicate/out-of-range records. The row's `tenant_id` is set to the attacker's tenant while foreign keys may point to another tenant. A deliberately failing insert after deletion destroys existing results.  
**Impact:** cross-tenant referential contamination, academic-record tampering, bulk data loss, denial of service, and unreliable reports.  
**Remediation:** replace the action with one transactional RPC. Validate JSON parse, array/record count, UUIDs, score `0..exam.max_score`, lengths, uniqueness, and same-tenant exam/student/subject ownership before mutation. Lock/version the exam and return conflict on stale edits. Add rollback and cross-tenant tests.

### SEC-004: M-Pesa callback authenticity is optional and callback values are trusted

**Severity:** High when `MPESA_CALLBACK_SECRET` is absent; Medium when a protected gateway supplies it  
**Evidence:** `supabase/functions/mpesa-callback/index.ts:5,9-14` skips authentication when the environment value is empty. Lines 34-37 pass callback `Amount` and `PhoneNumber` to reconciliation, defaulting amount only when absent, without equality checks in the function. There is no HTTP-method restriction, source control, timestamp, body-size check, or rate limit.  
**Exploit:** discover/obtain a pending CheckoutRequestID, then submit a forged successful callback. The database RPC has some state/idempotency controls, but the Edge Function does not establish callback provenance or bind supplied values to provider-query verification.  
**Impact:** false reconciliation, incorrect amount/phone records, fraudulent receipt notifications, payment-state integrity loss.  
**Remediation:** fail startup/deployment if callback protection is absent. Put the endpoint behind a provider-compatible authenticated gateway or unguessable per-request callback token, and independently query Daraja status before settlement where supported. In the RPC, lock the checkout/invoice and use the server-recorded amount; reject mismatches. Restrict method to POST, cap body size, rate limit, log safe replay identifiers, and test duplicate/forged callbacks.

### SEC-005: Parent messaging does not validate recipient or conversation ownership

**Severity:** High  
**Evidence:** `src/routes/(app)/parent/messages/+server.ts:7-28` accepts `teacher_id` and `conversation_id`, checks only message text, then inserts through service role. It does not prove the teacher belongs to the tenant or teaches a linked child, nor that the caller participates in a supplied conversation. It writes a teacher table ID to `messages.recipient_id`, whose FK expects `profiles(id)` (`supabase/migrations/20260722000006_create_messages.sql:5-8`). Parent page loading separately derives broad teacher IDs from all tenant sessions, not sessions associated with linked students/classes (`src/routes/(app)/parent/messages/+page.server.ts:8-24`).  
**Exploit:** submit an arbitrary profile/teacher/conversation UUID. Depending on ID relationships and constraints, this can create cross-tenant-addressed rows, inject into another conversation, or trigger database errors that are returned to the caller.  
**Impact:** confidentiality/integrity loss in parent-teacher communications, harassment/spam, cross-tenant metadata contamination, and persistent availability defects.  
**Remediation:** represent participants explicitly. Resolve teacher profile IDs server-side from authorized student/class relationships; require same-tenant membership; verify caller is a conversation participant on every append/read; enforce same-tenant participant constraints in the database; return generic errors. Prefer an RPC that derives sender and validates all IDs atomically.

### SEC-006: Bulk student import accepts arbitrary records and unbounded files

**Severity:** High  
**Evidence:** `src/routes/(app)/admin/students/import/+page.server.ts:13-39` accepts arbitrary JSON or any filename ending `.csv`, reads the whole file, splits naively on commas/newlines, adds `tenant_id`, and inserts every supplied property through service role. There is no size, row-count, MIME, field allowlist, or student-schema validation. Supabase local storage's 50 MiB setting does not limit this SvelteKit request (`supabase/config.toml:109-119`).  
**Exploit:** an administrator or compromised session submits a very large body for memory exhaustion, unexpected writable columns for mass assignment, malformed CSV, duplicate data, or oversized field values.  
**Impact:** application denial of service, integrity corruption, partial operational failure, and database-detail disclosure.  
**Remediation:** enforce platform/body limits and application file/row/column limits before buffering; use a real streaming CSV parser; allowlist exact fields; validate every row with the student schema; reject unknown keys; import through a transaction/staging table; provide bounded row-level errors; rate limit and audit imports.

### SEC-007: Rate limiting is incomplete, process-local, and reports incorrect limits

**Severity:** Medium  
**Evidence:** `src/lib/server/rate-limit.ts` stores counters in in-process maps with no cleanup/distributed store. Only login and CSV routes call it. Login is 5/min/IP; CSV is 120/min/tenant/process. STK, callback, credentials testing, messages, imports, and privileged actions have none. `rateLimitedHeaders` derives `X-RateLimit-Limit` from remaining count rather than configured maximum (`src/lib/server/rate-limit.ts:47-52`). The fixed `login-page` key is shared by all page viewers (`src/routes/login/+page.server.ts:8-10`).  
**Exploit:** distribute requests across serverless instances/restarts or target unlimited expensive endpoints/provider calls. A remote party can cause SMS/payment/provider traffic, DB load, credential test calls, or large writes subject only to authentication where applicable.  
**Impact:** provider charges, account lockout/upstream throttling, denial of service, and noisy/ineffective incident signals.  
**Remediation:** use a shared atomic limiter at edge/gateway/Redis with trusted client identity; define per-IP/user/tenant/resource/phone limits; add STK cooldown and idempotency; cap worker batch requests; return correct standard headers and `Retry-After`; alert on sustained rejection. Keep Supabase Auth limits as an additional layer, not the only one.

### SEC-008: Audit logging is sparse, mutable through service role, and lacks request context

**Severity:** Medium  
**Evidence:** `audit_log` exists (`supabase/migrations/20260712230000_core_tables.sql:194-205`), but repository migrations contain only one explicit insertion, in `grant_waiver` (`supabase/migrations/20260720000004_fix_payment_and_waiver.sql:139`). No generic DML audit trigger was found. Impersonation, role changes, credential changes/tests, settings, invoices, academic records, payroll transitions, imports, and payment callback decisions are not audit-written in application code. `X-Request-Id` is generated but not propagated to DB audit rows (`src/lib/server/middleware.ts:85-89`).  
**Exploit:** a privileged actor changes sensitive data and later denies it; an attacker with service-role capability can alter/delete logs because no append-only enforcement is shown.  
**Impact:** weak forensic evidence, delayed breach detection, inability to reconstruct financial/academic/admin changes, and compliance/accountability gaps.  
**Remediation:** implement append-only audit through database triggers or narrowly scoped RPCs, including actor, effective/real tenant, impersonation actor, action, target, before/after minimization, request ID, trusted IP, and outcome. Revoke update/delete from application roles; export tamper-evident logs to a separate retention system; alert on role/credential/impersonation/payment changes. Never log secrets or full sensitive message bodies.

### SEC-009: Security headers omit CSP and several browser hardening controls

**Severity:** Medium  
**Evidence:** `src/lib/server/middleware.ts:92-99` sets HSTS, nosniff, SAMEORIGIN, and referrer policy, but no Content-Security-Policy or Permissions-Policy. `X-Frame-Options` is `SAMEORIGIN`, not the `DENY` claimed in `docs/security.md`. `AppShell.svelte` uses `{@html}` for static icon markup, and `DataTable` accepts HTML render strings, increasing the importance of a CSP and strict data provenance.  
**Exploit:** a future or existing HTML injection has no CSP containment; same-origin framing remains possible; browser capabilities are not explicitly restricted.  
**Impact:** greater XSS/session-action blast radius and clickjacking exposure from same-origin compromised content.  
**Remediation:** deploy a nonce/hash-based CSP compatible with Svelte/Sentry, starting in report-only mode; remove string-HTML rendering where practical; set `frame-ancestors 'none'` unless framing is required; add Permissions-Policy and appropriate cross-origin policies. Test all production responses, not only SvelteKit paths.

### SEC-010: Impersonation lacks target validation, secure-cookie flag, and audit/revocation

**Severity:** Medium  
**Evidence:** `src/routes/(app)/super-admin/tenants/+page.server.ts:15-22` signs any nonempty tenant ID, uses raw `x-forwarded-for` for signing, sets HttpOnly/SameSite but not `Secure`, and writes no audit. `src/lib/server/impersonation.ts:4-7` falls back to the service-role secret if a dedicated secret is absent; signature comparison is ordinary string inequality; payload actor is not compared to the current user. A migration creates `impersonation_tokens`, but application code does not use it (`supabase/migrations/20260720000006_impersonation_and_sms.sql:4-20`).  
**Exploit:** configuration/proxy mismatch weakens binding or exposes the cookie over an accidental HTTP path; a stolen valid token cannot be centrally revoked; operations performed while impersonating have little attribution. Invalid tenant IDs can induce confused behavior.  
**Impact:** privileged tenant-context abuse, weak incident containment, and poor forensic accountability.  
**Remediation:** require a dedicated high-entropy secret, validate target tenant/status, bind token to current actor during verification, use constant-time comparison, set `Secure`, and use a trusted proxy-derived address consistently. Store a hashed token/session ID server-side for revoke/logout, require recent authentication/MFA, display a persistent banner, and audit start/stop/every sensitive impersonated action.

### SEC-011: CSV exports are vulnerable to spreadsheet formula injection

**Severity:** Medium  
**Evidence:** `src/lib/server/csv.ts:3-6` quotes and escapes CSV syntax but does not neutralize cells beginning with `=`, `+`, `-`, or `@`. Exported names, admissions, grade, phone, email, subject, and status can originate from users (`src/routes/(app)/**/**-csv/+server.ts`).  
**Exploit:** store a formula-like value in an exported field; an administrator opens the CSV in spreadsheet software that evaluates formulas.  
**Impact:** external requests, data exfiltration from the spreadsheet context, misleading content, or command execution in vulnerable/local configurations.  
**Remediation:** prefix dangerous cells with an apostrophe or use a safe spreadsheet export library/policy; document treatment; add tests for leading formula characters, tabs, and whitespace bypasses.

### SEC-012: Dependency and supply-chain gates are incomplete

**Severity:** Low  
**Evidence:** `npm audit --json` on 2026-07-22 reported four low-severity dependency findings: `cookie` advisory `GHSA-pxg6-pf52-xh8x` through `@sveltejs/kit`, with effects on both adapters. No moderate/high/critical findings were reported. CI does not run `npm audit`, secret scanning, SAST, migration security tests against a live DB, SBOM generation, or container scanning (`.github/workflows/ci.yml`). Edge imports use an unpinned major package URL (`https://esm.sh/@supabase/supabase-js@2`, `supabase/functions/_shared/supabase.ts:1`). GitHub Actions are tag-pinned, not commit-SHA pinned. Docker runs as root and performs a build-time `npm install` that can alter the lock-resolved graph (`Dockerfile:6-21`).  
**Exploit:** exploit a vulnerable transitive package or compromise a mutable dependency/action/import source.  
**Impact:** build/runtime compromise, cookie/header injection edge cases, and nonreproducible artifacts.  
**Remediation:** update to a fixed compatible SvelteKit/cookie dependency after regression testing; add audit/SCA policy, Dependabot/Renovate, secret scanning, SAST, SBOM and image scanning; pin Deno imports and Actions immutably; use `npm ci` only; run the final image as a non-root user.

### SEC-013: Authentication hardening claims are not implemented

**Severity:** Medium  
**Evidence:** local config enables public signup and email signup, requires only six-character passwords with no complexity, disables email confirmation and secure password change, and disables TOTP enrollment/verification (`supabase/config.toml:150-178,202-217,279-292`). Application login has no MFA assurance check, CAPTCHA, lockout state, or privileged-role reauthentication (`src/routes/login/+page.server.ts`). The implementation selects the oldest role when users have multiple roles.  
**Exploit:** weak/reused password attacks, signup abuse if hosted settings match, or privileged access without MFA. Process-local login limits are bypassable across instances.  
**Impact:** account takeover, especially high-impact administrator/bursar/super-admin compromise.  
**Remediation:** disable public signup unless explicitly required; use invite/provision workflows; require strong breached-password-resistant policy, verified email, secure password changes, MFA/AAL2 for privileged roles, recovery protections, and recent-auth checks for credentials/impersonation/payment administration. Enforce authorization from all roles deterministically rather than first-row selection.

### SEC-014: Worker concurrency and unbounded batch controls can duplicate sends or exhaust resources

**Severity:** Medium  
**Evidence:** `notify` accepts an unvalidated caller limit, selects queued rows without a lease/lock or `next_retry_at` filter, and sends sequentially (`supabase/functions/notify/index.ts:17-29,53-77`). `payment-reminders` reads up to 200 rows then performs separate conditional update and insert operations without selecting affected rows or checking insert errors (`supabase/functions/payment-reminders/index.ts:28-41,70-90`).  
**Exploit:** concurrent authorized scheduler calls or oversized notify limits cause duplicate provider sends, long-running workers, retries ahead of schedule, and resource pressure.  
**Impact:** duplicate SMS charges, parent spam, function timeout, and inconsistent notification state.  
**Remediation:** claim rows atomically with `FOR UPDATE SKIP LOCKED`/lease IDs in RPCs; enforce bounded batch size; honor `next_retry_at`; use idempotency constraints; process with controlled concurrency and timeouts; check every write result.

### SEC-015: Database and upstream errors leak implementation detail inconsistently

**Severity:** Low  
**Evidence:** many admin actions return `error.message`, including students, teachers, parents, fees, subjects, invoices, schedules, academic records, and import. Parent messaging returns the database message directly (`src/routes/(app)/parent/messages/+server.ts:30-32`). Other paths correctly return generic errors and log server-side.  
**Exploit:** submit constraint-breaking values and collect table/constraint/schema messages.  
**Impact:** reconnaissance and disclosure of implementation details; occasional sensitive upstream content exposure.  
**Remediation:** map known constraints to stable public codes and generic messages; log structured details server-side with request ID and redaction. Standardize error handling across actions, endpoints, and Edge Functions.

## OWASP Top 10 (2021) mapping

| OWASP category | Current posture and findings |
|---|---|
| A01 Broken Access Control | Route/role and many tenant predicates are strengths. Universal service-role use and missing ownership/foreign-tenant checks are major weaknesses: SEC-002, SEC-003, SEC-005, SEC-010. |
| A02 Cryptographic Failures | Supabase/Vault functions and HMAC exist, but credential plaintext handling is critical and impersonation reuses service-role secret as fallback: SEC-001, SEC-010. TLS is assumed at deployment; local TLS is disabled. |
| A03 Injection | Query builders reduce SQL injection. Risks remain in arbitrary bulk mass assignment, unvalidated academic JSON, CSV formula injection, and HTML-string rendering: SEC-003, SEC-006, SEC-011. No user-controlled shell execution was found. |
| A04 Insecure Design | Optional callback trust, nontransactional replacement, weak worker claiming, and lack of idempotency/rate design: SEC-003, SEC-004, SEC-007, SEC-014. |
| A05 Security Misconfiguration | MFA/signup/password defaults, missing CSP, optional callback secret, broad database network defaults in local config, and unverified function/deployment settings: SEC-004, SEC-009, SEC-013. |
| A06 Vulnerable and Outdated Components | Four low npm findings and missing automated SCA/pinning/image gates: SEC-012. |
| A07 Identification and Authentication Failures | Verified Supabase user and generic invalid-login response are strengths. MFA/lockout/CAPTCHA/recent-auth are absent and first-role selection is ambiguous: SEC-007, SEC-013. |
| A08 Software and Data Integrity Failures | CI checks exist, but artifact/dependency pinning, SBOM/signing, transactional academic writes, and tamper-evident audit are incomplete: SEC-003, SEC-008, SEC-012. |
| A09 Security Logging and Monitoring Failures | Request IDs and optional Sentry exist; sensitive business audit events and alerting are largely absent: SEC-008. |
| A10 Server-Side Request Forgery | No request-controlled outbound URL was found. Safaricom URLs are fixed and Mobiwave base is environment-controlled. Preserve this allowlist model; validate deployment environment values and disable redirects or revalidate destinations where practical. |

## Topic-specific review

### Secrets

- Public and private environment imports are separated; service role is imported only server-side (`src/lib/supabase/server.ts`). Example env files use placeholders and no secret values are documented.
- Tenant credential handling is unsafe per SEC-001. Rotation is required for values entered through the current UI.
- The service-role key is overprivileged and doubles as a worker bearer and impersonation fallback. Separate keys by purpose and rotate independently.
- Do not place provider response bodies, credential blobs, Authorization headers, passwords, callback secrets, or full PII into Sentry/audit logs.
- No repository secret-scanner result is available; add CI and pre-commit scanning. Review Git history separately before release.

### Sessions, cookies, and JWTs

- Supabase SSR manages auth cookies; `auth.getUser` validates them. The app does not trust a role claim from JWT; it loads roles from the database, which avoids stale custom claims but costs a privileged query.
- Access-token expiry is locally configured at one hour with refresh-token rotation and 10-second reuse interval (`supabase/config.toml:157-167`). Hosted values need verification.
- `locals.session` is always initialized null and not populated; authorization uses `locals.user`, role, and tenant.
- Display and impersonation cookies are HttpOnly/SameSite=Lax. The impersonation cookie lacks `Secure`; auth-cookie flags depend on `@supabase/ssr` and deployment.
- Logout is a state-changing GET and ignores sign-out errors.
- No MFA/AAL check, inactivity timeout, absolute session timebox, device/session management, or recent-auth gate is implemented.

### CSRF

- SvelteKit form actions rely on framework same-origin checks and SameSite cookies; no custom token exists. Keep SvelteKit `csrf.checkOrigin` enabled and test deployed proxy/origin behavior.
- `/api/logout` can be cross-site triggered because it uses GET; move to POST.
- `/parent/messages` uses cookie auth with JSON. Browser CORS/preflight makes ordinary cross-origin JSON harder, but the endpoint does not explicitly verify `Origin`/CSRF and should use a named action or enforce same-origin.
- Edge user endpoints use Authorization bearer tokens and do not use SvelteKit cookies directly; CORS is not authentication.

### XSS and output handling

- Svelte interpolation escapes values. No direct user-controlled `{@html}` source was identified in the reviewed code.
- Static icons use `{@html}` and `DataTable` render callbacks return HTML strings. Keep these APIs restricted to trusted templates or replace with components.
- CSP is absent (SEC-009).
- Database/provider errors are displayed in some pages and are escaped by Svelte, reducing XSS but still leaking detail.

### SQL/command/template injection

- Supabase query builders and parameterized RPC calls are used; no application string-built SQL or shell command execution was found.
- Security-definer functions generally set `search_path = public` and revoke sensitive execution, which is good practice. Continue schema-qualifying objects and reviewing every grant.
- Arbitrary import object fields are a mass-assignment issue, not classic SQL injection (SEC-006).
- Payroll RPC name/table helper inputs are internal constants; do not expose generic query helpers to request data.

### SSRF and outbound requests

- Safaricom endpoints are selected from fixed sandbox/production constants.
- Mobiwave uses an environment-configured base with fixed `/balance` and `/sms/send` paths.
- No request-supplied URL fetch was found. `logo_url` is stored but not server-fetched in reviewed code.
- Add outbound DNS/IP allowlisting, connect/read timeouts, response-size limits, and redirect controls for defense in depth.

### Uploads and imports

- There is no general upload endpoint or storage bucket policy in application code.
- Student import is fully buffered and effectively unbounded, with extension-only CSV detection and no malware/content scanning (SEC-006).
- Local Supabase storage allows 50 MiB globally and S3 protocol is enabled, but no application bucket policy is configured (`supabase/config.toml:109-123`). Hosted storage exposure must be checked separately.

### Dependencies and build

- Audit result: 0 critical, 0 high, 0 moderate, 4 low npm findings on 2026-07-22. The actionable advisory is `GHSA-pxg6-pf52-xh8x` in transitive `cookie`; affected direct packages are SvelteKit and both adapters.
- `package-lock.json` supports reproducible npm installs, but Docker runs another mutable `npm install` and runs as root.
- Deno imports, Actions, base images, and production artifacts need immutable pinning and provenance controls.
- CI has no dependency/security scan or release artifact signing.

### Audit logging and monitoring

- Sentry server/client initialization is conditional on DSN, with 10% tracing (`sentry.server.config.ts`, `sentry.client.config.ts`). This is error telemetry, not a security audit trail.
- Request IDs are response-visible but not consistently logged or propagated to Edge/database operations.
- `audit_log` viewing is limited to the first 100 newest rows and only super-admin route access, but writes are sparse and no append-only guarantee is shown.
- Define alerts for login abuse, role/credential changes, impersonation, callback mismatches, repeated STK, reconciliation conflicts, mass export/import, provider failures, and cross-tenant authorization denials.

## Release-blocking checklist

The following items should be treated as go-live blockers for production data/provider credentials:

- [ ] Replace direct credential storage with tested server-side encryption; rotate every credential submitted through the old path.
- [ ] Remove routine service-role CRUD or place every privileged operation behind narrow, actor-aware authorization/RPC boundaries.
- [ ] Make academic result replacement validated, tenant-safe, transactional, bounded, and concurrency-aware.
- [ ] Require and verify M-Pesa callback authenticity; reconcile against server-recorded/provider-verified amount under a row lock.
- [ ] Repair messaging participant/recipient modeling and enforce same-tenant conversation ownership in the database and server.
- [ ] Bound and validate student imports; reject unknown columns; add transaction/staging and DoS controls.
- [ ] Add shared rate limits/idempotency for login, STK, callback, credentials testing, messaging, imports, exports, and workers.
- [ ] Implement append-only audit events for role, credential, impersonation, settings, academic, payroll, invoice, waiver, payment, import/export, and callback changes.
- [ ] Disable public signup or formally approve it; require MFA/recent auth for privileged roles and credential/impersonation operations.
- [ ] Add CSP and verify all cookie/security headers over the production ingress; make logout POST.
- [ ] Resolve or explicitly accept current npm findings; add SCA, secrets, SAST, SBOM, and image scanning gates.
- [ ] Run integration authorization tests against a migrated database for every role and cross-tenant ID substitution.
- [ ] Verify hosted Supabase RLS, grants, function JWT settings, Vault, Auth, backup/PITR, network, CORS, and storage settings rather than assuming local config matches.
- [ ] Conduct an authorized staging penetration test covering tenant isolation, payment callback/STK, impersonation, imports/exports, and session handling.
- [ ] Establish incident contacts, log retention, provider revocation procedures, backup restore testing, and breach-notification decision flow.

## Incident response

### Preparation

- Maintain an on-call owner, security lead, Supabase owner, school/tenant contact process, and Safaricom/Mobiwave escalation contacts.
- Inventory and label service-role, anon, impersonation, callback, Sentry, Daraja, and Mobiwave credentials by environment and owner.
- Centralize immutable audit/security logs with request IDs, actor/effective tenant, deployment version, and redacted event detail.
- Pre-stage key rotation, session revocation, Edge Function disablement, tenant suspension, callback blocking, notification pause, and read-only-mode procedures.
- Define Kenya Data Protection Act assessment and notification responsibilities with counsel/DPO.

### Detect and triage

1. Record incident start time, reporter, affected environment, indicators, and incident commander.
2. Preserve relevant application, Supabase Auth/database/Edge, ingress, Sentry, provider, and deployment logs. Do not put secrets into the ticket/chat.
3. Determine affected tenants, actors, records, credentials, payments/messages, and time window.
4. Classify whether the event is active compromise, data exposure, payment integrity failure, provider abuse, availability event, or false positive.

### Containment

1. Revoke affected Supabase sessions and disable compromised users/roles.
2. Rotate the narrowest affected secret first. If service role is exposed, assume RLS bypass and rotate it urgently, then redeploy all consumers.
3. Disable affected Edge Functions/actions or place ingress blocks/rate limits without destroying evidence.
4. Pause STK/notification workers and callbacks if payment/provider integrity is uncertain; preserve pending state for reconciliation.
5. Suspend only affected tenants when possible; avoid platform-wide destructive changes.

### Eradication and recovery

1. Fix the root authorization/input/secret issue and add a regression test before restoring access.
2. Validate migration state and search for persistence, unauthorized roles, credentials, callbacks, payments, messages, and audit tampering.
3. Restore from verified backups only when integrity requires it; rehearse reconciliation of post-backup financial events.
4. Rotate provider credentials and revalidate callback/worker configuration.
5. Re-enable in stages with heightened alerts and tenant-specific verification.

### Post-incident

- Produce a timeline, root cause, control failures, affected data subjects/tenants, financial reconciliation, and corrective owners/dates.
- Make legally required regulator/customer notifications using verified scope; avoid unsupported assurances.
- Update threat model, runbooks, tests, release gates, and credential inventory. Track every corrective action to closure.

## Secure target architecture

1. **Ingress:** managed TLS/WAF/API gateway with body-size limits, method allowlists, shared rate limiting, bot protection, normalized trusted client IP, request IDs, and callback-specific controls.
2. **SvelteKit BFF:** first-party UI only; user-scoped Supabase client for ordinary queries; POST-only state changes; schema validation; stable internal error mapping; no secret exposure.
3. **Authorization:** database-backed RBAC/ABAC deriving actor and tenant from verified identity. Parent/teacher ownership and impersonation are explicit attributes. Avoid caller-supplied tenant IDs.
4. **Database:** RLS as an effective mandatory boundary for normal traffic, `FORCE ROW LEVEL SECURITY` where appropriate, cross-tenant composite foreign-key constraints, least-privilege grants, and a small set of reviewed security-definer RPCs for atomic financial/academic workflows.
5. **Privileged workers:** separate narrowly scoped credentials for notifications, reminders, reconciliation, and credential testing. No general service-role bearer shared across functions. Atomic queue leases, bounded concurrency, idempotency, retries, and dead-letter handling.
6. **Secrets:** typed server-side submission, envelope encryption with managed KMS/Vault, versioned key references, rotation, no plaintext persistence/logging, and test-before-activation. Separate tenant, platform, callback, worker, and impersonation keys.
7. **Payments:** server-derived amount/phone, one active checkout constraint, idempotency key/state machine, authenticated or provider-verified callback, locked reconciliation transaction, immutable ledger, and exception queue for mismatches.
8. **Sessions:** invitation-only provisioning if appropriate, strong password/breached-password checks, MFA/AAL2 and recent auth for privileged actions, secure/HttpOnly/SameSite cookies, rotation/revocation, and absolute/inactivity limits.
9. **Data pipelines:** streaming bounded imports with staging/validation and transactional commit; streaming or asynchronous exports with authorization snapshot, formula neutralization, expiry, and audit.
10. **Observability:** append-only off-platform audit trail, structured redacted logs, distributed trace/request IDs, security alerts, provider metrics, tenant anomaly detection, and tested retention/incident retrieval.
11. **Delivery:** immutable dependency/action/image pins, SCA/SAST/secret/IaC/container scans, SBOM and signed provenance, non-root minimal image, migration verification, authorization integration suite, and staged deployment rollback.

## Documentation drift

`docs/security.md` is aspirational and materially mismatches current implementation. It claims privileged MFA, lockout/CAPTCHA, JWT tenant claims, comprehensive append-only audit triggers, CSP, double-submit CSRF, per-tenant/user/phone limits, vault-only credential handling, callback state guarantees, non-root Docker, npm-audit CI, and other controls that are absent or contradicted by current code/configuration. It also references React/Next.js despite this being SvelteKit. Security decisions should use this dated implementation audit until the older document is corrected or explicitly labeled as target state.
