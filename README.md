# ReClass

Remedial Classes Management System — a multi-tenant SaaS for managing remedial/extra-cost classes in Kenyan schools.

Built by **Mobiwave Innovations Ltd**. Anchor tenant: **Malingi High School**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 5, Svelte 5 runes, TypeScript (strict), TailwindCSS 4 |
| Database | Supabase (PostgreSQL), Row Level Security, Edge Functions |
| Auth | Supabase Auth (email/password, invite-only) |
| Payments | M-Pesa Daraja API (STK Push) |
| SMS | Mobiwave API |
| UI | bits-ui, Lucide Icons, LayerCake (charts) |
| CI | Playwright (E2E), Vitest (unit) |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  SvelteKit  │────▶│  Supabase    │────▶│  PostgreSQL  │
│  + Svelte 5 │     │  Auth + REST │     │  + Vault     │
│  + SSR      │     │  + Functions │     │  + Encrypt   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                     │
       │ M-Pesa STK          │ SMS via
       │ Push via            │ Mobiwave
       │ Daraja API          │ API
       ▼                     ▼
   Safaricom            Parents' Phones
```

### Tenant isolation strategy

ReClass uses a **service-role client** (`locals.srv`) on the server and enforces tenant isolation in **application code** via a mandatory `.eq('tenant_id', locals.tenantId)` filter on every query (reads and writes). RLS policies are intentionally NOT used — the `current_setting('app.tenant_id')` pattern conflicts with PostgREST transaction scoping, and the service-role client bypasses RLS anyway, so RLS would be dead code.

**Consequence (security contract):** tenant isolation depends entirely on every server query including `.eq('tenant_id', locals.tenantId)`. Never write a server-side query against tenant-scoped tables without it, and never use the service-role client from the browser. The single exception is `super-admin`, which is cross-tenant by design (tenants + audit). Money-path writes (`reconcile_payment`) are tenant-scoped inside the RPC via `p_tenant_id`.

## Roles

| Role | Route | Access |
|------|-------|--------|
| `super_admin` | `/super-admin` | All tenants, audit logs |
| `school_admin` | `/admin` | Full CRUD for their tenant |
| `principal` | `/principal` | Oversight, effectiveness reports |
| `teacher` | `/teacher` | Mark attendance, view timetable |
| `bursar` | `/bursar` | Invoices, waivers, revenue |
| `parent` | `/parent` | Child's attendance, fees, payments |

## Quick Start

```bash
# Install
npm install

# Set up environment variables in .env
# Required: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Run dev server
npm run dev

# Type-check
npm run check

# Build
npm run build

# Test
npm run test
```

## Project Structure

```
src/
├── routes/
│   ├── (app)/              # Authenticated routes
│   │   ├── admin/          # School admin (17 pages)
│   │   ├── teacher/        # Teacher (3 pages)
│   │   ├── parent/         # Parent (5 pages)
│   │   ├── principal/      # Principal (3 pages)
│   │   ├── bursar/         # Bursar (5 pages)
│   │   ├── super-admin/    # Platform admin (3 pages)
│   │   ├── account/        # User account
│   │   └── notifications/  # Notifications
│   ├── login/              # Auth page
│   └── +error.svelte       # Global error boundary
├── lib/
│   ├── auth.ts             # Role definitions, route map
│   ├── cn.ts               # Tailwind class merge utility
│   ├── components/         # Shared UI components
│   │   ├── layout/         # AppShell, sidebars, nav
│   │   ├── ui/             # Button, Card, DataTable, KpiCard
│   │   └── DashboardContent.svelte
│   ├── stores/             # Theme store
│   └── supabase/
│       ├── client.ts       # Browser client (anon key)
│       └── server.ts       # Server client + service role client
├── hooks.server.ts         # Auth, RLS bypass, env validation
└── app.d.ts                # Locals type definitions

supabase/
├── migrations/             # 15 migration files (unapplied to hosted DB)
├── functions/              # 4 Edge Functions (stk, callback, notify, test)
└── seed/                   # Seed data scripts
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run check` | Type-check (0 errors target) |
| `npm run build` | Production build (Vercel adapter) |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |

## Known Limitations

- Database migrations must be applied via Supabase SQL Editor (pg port blocked from dev network)
- `teacher_attendance` and `group_members` tables require manual creation (see `missing_tables.sql`)
- Edge Functions deployed but not yet wired from frontend
- 25+ files use `// @ts-nocheck` due to Zod/Superforms v3 type incompatibility
- No git remote configured

## License

Proprietary — Mobiwave Innovations Ltd.
