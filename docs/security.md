# ReClass — Security (Section 18)

## 1. Threat Model (STRIDE)
- **Spoofing:** fake parent/login → MFA for privileged roles; JWT signed by Supabase.
- **Tampering:** edit attendance post-lock → lock + audit + edit_reason; DB writes via RLS only.
- **Repudiation:** "I didn't mark that" → immutable audit_log (actor, IP, before/after).
- **Info disclosure:** cross-tenant leak → RLS `tenant_id` policy on every table; no raw SQL from client.
- **DoS:** STK flood → per-phone/per-tenant rate limits; 429 + backoff.
- **Elevation:** teacher→admin → RBAC enforced server-side (RLS + edge checks), never trust client role.

## 2. OWASP Top 10 Mapping
| # | Risk | Control |
|---|---|---|
| A01 | Broken Access Control | RLS + server-side RBAC; 403 default-deny |
| A02 | Crypto Failures | TLS 1.2+; AES-256 at rest (Supabase); secrets in vault, never in DB |
| A03 | Injection | Parameterized PostgREST/ORM; Zod validation; no string SQL |
| A04 | Insecure Design | Threat model; lock/approve workflow; idempotent payments |
| A05 | Misconfig | Secure headers (CSP, HSTS, X-Frame-Options); no verbose errors |
| A06 | Vulnerable Components | `npm audit` in CI; pinned deps; Dependabot |
| A07 | Auth Failures | Supabase Auth + MFA + lockout (5 fails) + CAPTCHA |
| A08 | Integrity Failures | Signed webhooks (M-Pesa HMAC); CI signing; SRI on assets |
| A09 | Logging Failures | Centralized logs; audit_log append-only; alerting |
| A10 | SSRF | Edge Functions egress allowlist; no user-supplied URLs fetched |

## 3. Authentication & Session
- Supabase Auth (email+password, bcrypt/argon). MFA (TOTP) for admin/bursar/super_admin.
- JWT `tenant_id` claim; refreshed via httpOnly cookie; short access token (15m).
- Lockout: 5 fails → 15-min lock + CAPTCHA + admin alert. No user enumeration (generic messages).

## 4. Authorization
- RBAC roles in `user_roles`; every Edge Function re-checks role from JWT (defense in depth vs RLS).
- RLS guarantees tenant isolation even if app bug occurs.

## 5. Encryption
- In transit: TLS 1.2+ (HSTS). At rest: Supabase managed encryption.
- **Tenant credentials (Daraja + Mobiwave):** stored in `credentials.encrypted_blob`, sealed with AES-256-GCM using a KEK held in Supabase Vault (not in the DB, not in app env). Plaintext is returned ONLY by a `SECURITY DEFINER decrypt_credential(id)` function invoked inside Edge Functions — never sent to the browser, never logged. Two purposes: `school_send` (tenant's own sends/charges, RLS-scoped to that tenant) and `platform_billing` (Mobiwave's own account, `scope='platform'`, super_admin only, used for billing/ops never as a tenant fallback).
- `tenants.mpesa_passkey_secret_ref` stores a *vault key reference*, never the secret value.

## 6. Web Defense
- **XSS:** CSP `default-src 'self'`; React auto-escaping; sanitize any HTML (notes) with DOMPurify; no `dangerouslySetInnerHTML`.
- **CSRF:** SameSite=Lax/Strict cookies + double-submit token on state-changing fetches; JSON API only.
- **SQLi:** ORM/PostgREST parameterized; Zod validates all inputs before query.

## 7. M-Pesa Callback Security
- Verify `x-mpesa-signature` HMAC-SHA256 vs shared key on every callback. Reject unsigned. Idempotent by `CheckoutRequestID`.

## 8. Rate Limiting & Monitoring
- Per tenant/user/phone limits (see api.md). Failed auth, 403s, 429s monitored; anomaly alerts.
- Logging: structured JSON to central drain; PII masked (phone → last 4). Sentry for errors.

## 9. Compliance — Kenya Data Protection Act 2019
- Student (minor) data minimized; lawful basis (school contract); parent consent for SMS stored.
- Right to access/erase: purge job anonymizes on offboard. Data residency: hosted in-region (KE-friendly; Supabase region af-south-1 if available, else eu-west + DPA).
- Audit trail satisfies accountability obligations.

## 10. Production Hardening Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Public signups disabled in Supabase Auth | Required |
| 2 | RLS enabled on all tables | Required (implemented via migration 0004) |
| 3 | `poweredByHeader: false` | Set in next.config.js |
| 4 | HSTS `max-age=63072000; includeSubDomains; preload` | Set in next.config.js |
| 5 | X-Frame-Options: DENY | Set in next.config.js |
| 6 | X-Content-Type-Options: nosniff | Set in next.config.js |
| 7 | Referrer-Policy: strict-origin-when-cross-origin | Set in next.config.js |
| 8 | Permissions-Policy: camera/microphone/geolocation blocked | Set in next.config.js |
| 9 | CSRF protection via Supabase Auth cookies | Auto (httpOnly + SameSite) |
| 10 | Audit logging on all INSERT/UPDATE/DELETE | Via audit_log trigger |
| 11 | Credential encryption at rest (Supabase Vault) | Implemented |
| 12 | Credential decryption restricted to Edge Functions | Implemented (SECURITY DEFINER) |
| 13 | Password strength enforced | Supabase Auth (configure in dashboard) |
| 14 | Rate limiting on API routes | Via reverse proxy |
| 15 | Docker container runs as non-root user | Implemented (nextjs user) |
| 16 | No secrets in client bundle | Verified (env vars server-only) |
| 17 | Database backups configured | Supabase automated daily + PITR |

## 11. Recommended Additions

- **Sentry** for error tracking and performance monitoring
- **CSP** header with strict policy (test in staging before production)
- **WAF** (Cloudflare or DirectAdmin ModSecurity)
- **Data retention policy** — schedule pruning of old audit_log rows (>90 days)
- **Penetration test** before onboarding additional tenants
- **Bug bounty program** for security researchers (post-launch)
