# ReClass — Developer Guide

## Prerequisites
Node 18+, npm, Supabase CLI, Deno (Edge Functions), Git, Docker (local Supabase).

## Setup
```
git clone <repo> && cd reclass
cp .env.example .env.local      # fill Supabase URL/keys, M-Pesa sandbox, SMS key
npm install
supabase start                   # local Postgres + Auth + Storage
supabase db reset                # apply migrations + seed (creates malingi-high tenant)
npm run dev                      # Vite development server (normally :5173)
```

## Project Layout
```
src/routes/           # SvelteKit routes and role-scoped route group
src/lib/components/   # layout, dashboard, UI, and chart components
src/lib/              # Supabase client, RBAC, notifications, and domain utilities
supabase/migrations/  # SQL (tables, RLS, triggers, seed)
supabase/functions/   # Edge Functions: stk, mpesa-callback, scheduler, notifications, reports
```

## Conventions
- TypeScript strict. No `any` in services. Tailwind tokens only (no raw hex).
- All DB access through Supabase client (PostgREST) or typed RPC; never raw client SQL.
- Every mutating service calls `audit.middleware` (appends audit_log).
- Forms: shared Zod schema reused by API validation (single source of truth).
- RLS: every new table gets a `tenant_isolation` policy; add an integration test proving no leak.

## Workflow
1. Branch `feat/...` from `main`. 2. Migrations + code. 3. Tests (vitest). 4. PR → CI.
5. Merge → auto-deploy staging. 6. E2E nightly. 7. Prod deploy on release tag.

## Edge Functions
```
supabase functions deploy stk --no-verify-jwt   # callback needs public, verify HMAC instead
supabase functions deploy mpesa-callback
```
Local test: `supabase functions serve`.

## Testing
`npm run test` (unit) · `npm run test:integration` (needs local Supabase) · Playwright in `e2e/`.

## Payments (critical)
Never trust client for amounts. STK amount computed server-side from invoice balance.
Reconcile idempotently by `CheckoutRequestID`. See `api.md` + `security.md`.
