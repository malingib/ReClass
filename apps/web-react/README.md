# @eshule/web-react — Vite + React shell (alongside SvelteKit)

Scaffold for the SvelteKit → React migration. See root
`REACT-MIGRATION-CHECKLIST.md` for the file-by-file mapping, Mobiwave v3
payload fix, and Edge/RLS plan. Reference implementation:
`malangaweb/welfare-connect-main` (Vite + React + shadcn + TanStack Query).

## Run

```bash
npm install
npm run dev --workspace=@eshule/web-react
```

Env: copy `.env.example` to `.env`. Browser keys only (`VITE_*`, anon key).
Mobiwave token and `service_role` stay in Supabase Edge secrets.
