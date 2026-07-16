# ReClass

Remedial Classes Management System — a multi-tenant SaaS for managing remedial/extra-cost classes in Kenyan schools.

Built by **Mobiwave Innovations Ltd**. Anchor tenant: **Malingi High School**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
|| Frontend | SvelteKit 5, Svelte 5, TypeScript, TailwindCSS 4 |
| Database | Supabase (PostgreSQL), Row Level Security, Edge Functions |
| Auth | Supabase Auth (email/password, invite-only) |
| Payments | M-Pesa Daraja API (STK Push) |
| SMS | Mobiwave API |
| Infra | Docker, DirectAdmin EVO VPS |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
|  SvelteKit   |────▶│  Supabase    │────▶│  PostgreSQL  │
|  + Svelte 5  |     │  Auth + RLS  │     │  + Vault     │
│  + middleware │     │  + Functions │     │  + Encryption │
└─────────────┘     └──────────────┘     └─────────────┘
       │                     │
       │ M-Pesa STK          │ SMS via
       │ Push via            │ Mobiwave
       │ Daraja API          │ API
       ▼                     ▼
   Safaricom            Parents' Phones
```

## Multi-Tenancy

ReClass uses **isolated rows** (not isolated databases). Every table has `tenant_id` with RLS policies enforced by `app.tenant_id` JWT claim:

- `super_admin` — all tenants
- `school_admin` — their tenant (students, teachers, scheduling, fees)
- `teacher` — their groups, their sessions
- `parent` — their children's data only
- `bursar` — their tenant's financial records
- `principal` — their tenant's oversight data

## Quick Start

```bash
# Install
npm install

# Copy environment
cp .env.example .env.local
# Edit .env.local with your Supabase project credentials

# Run Supabase locally
npx supabase start

# Run dev server
npm run dev

# Build
npm run build
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for full production setup.

```bash
# Docker
docker compose build
docker compose up -d
```

## Project Structure

```
src/
├── app/           # Next.js App Router pages
│   ├── admin/     # School admin portal (11 pages)
│   ├── teacher/   # Teacher portal (3 pages)
│   ├── parent/    # Parent portal (8 pages)
│   ├── principal/ # Principal dashboard (3 pages)
│   ├── bursar/    # Bursar portal (4 pages)
│   ├── super-admin/ # Platform admin (2 pages)
│   ├── account/   # User account settings
│   ├── login/     # Auth pages
│   └── api/       # API routes
├── components/    # Reusable UI components
├── lib/           # Utilities (Supabase clients, auth helpers)
└── middleware.ts  # Auth + role-based routing

supabase/
├── migrations/   # 6 migration files
├── functions/    # 4 Edge Functions (stk, callback, notify, test)
└── seed.sql      # Malingi High School seed data
```

## Documentation

| Doc | Contents |
|-----|----------|
| [SRS](docs/srs.md) | Software Requirements Specification |
| [Architecture](docs/architecture.md) | System architecture |
| [Database](docs/database.md) | Schema and RLS policies |
| [API](docs/api.md) | API reference |
| [Security](docs/security.md) | Security model |
| [Deployment](docs/deployment.md) | Production deployment guide |
| [Sprint Plan](docs/sprint-plan.md) | 8-sprint delivery plan |
| [CHANGELOG](docs/CHANGELOG.md) | Version history |

## License

Proprietary — Mobiwave Innovations Ltd.
