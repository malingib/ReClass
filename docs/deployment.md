# Deploying ReClass — Production Guide

## Infrastructure

- **Hosting**: DirectAdmin EVO VPS (or any Linux VPS with Docker)
- **Database**: Supabase (managed PostgreSQL) — production project
- **Edge Functions**: Deployed via Supabase CLI
- **Runtime**: Docker container exposing port 3000
- **Reverse Proxy**: DirectAdmin's Apache/Nginx sits in front, proxies to localhost:3000

## Prerequisites

```bash
# Install Docker + Docker Compose
apt install docker.io docker-compose-v2
```

## 1. Supabase Production Project

| Step | Action |
|------|--------|
| 1.1 | Create project at [supabase.com/dashboard](https://supabase.com/dashboard) |
| 1.2 | Copy project URL and anon key → `.env.production` |
| 1.3 | Run `supabase link --project-ref <ref>` |
| 1.4 | Run `supabase db push` to apply all migrations |
| 1.5 | Disable public signups in Auth → Settings |
| 1.6 | Deploy Edge Functions: `supabase functions deploy stk` |
| 1.7 | Deploy Edge Functions: `supabase functions deploy mpesa-callback` |
| 1.8 | Deploy Edge Functions: `supabase functions deploy notify` |
| 1.9 | Deploy Edge Functions: `supabase functions deploy credentials-test` |
| 1.10 | Set up Vault KEK: `select pgsodium.create_key();` → store the key |
| 1.11 | Enable Vault: `supabase vault init` |
| 1.12 | Set `enable_signup = false` in Auth settings |

## 2. Environment Variables

Create `.env.production`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

## 3. M-Pesa Setup

| Step | Action |
|------|--------|
| 3.1 | Register as Safaricom Partner (Daraja) — 1-2 week lead |
| 3.2 | Get Consumer Key + Secret for production |
| 3.3 | Set Passkey from Safaricom portal |
| 3.4 | Add M-Pesa credentials via admin UI → Credentials |
| 3.5 | Test credentials with "Test" button |
| 3.6 | Register Callback URL: `https://yourdomain.com/api/callback/mpesa` |

## 4. SMS (Mobiwave)

| Step | Action |
|------|--------|
| 4.1 | Register sender ID `RECLASS` with Mobiwave |
| 4.2 | Get API token from Mobiwave dashboard |
| 4.3 | Add SMS credentials via admin UI → Credentials |
| 4.4 | Test with "Test" button |

## 5. Build + Run

```bash
# Build Docker image
docker compose build

# Run
docker compose up -d

# Check health
curl http://localhost:3000/api/healthz
```

## 6. DirectAdmin Reverse Proxy

In DirectAdmin → Domain Setup → Apache Proxy:

```
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
```

## Production Checklist

- [ ] Public signups disabled (Auth Settings)
- [ ] RLS enabled on all tables (verified via query)
- [ ] SSL certificate active (Let's Encrypt)
- [ ] Database backups configured (Supabase daily + Point-in-time)
- [ ] Supabase Vault KEK created and stored
- [ ] M-Pesa credentials added and tested
- [ ] SMS credentials added and tested
- [ ] All 4 Edge Functions deployed
- [ ] Security headers set (X-Frame-Options, HSTS, CSP)
- [ ] `poweredByHeader: false` active
- [ ] `max-age=63072000` HSTS set
- [ ] Docker container health check passing
- [ ] Monitoring URL: `/api/healthz` returns 200
- [ ] Audit log viewer accessible to super admin
- [ ] Error monitoring configured (optional: Sentry)
