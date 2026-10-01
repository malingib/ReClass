# ADR-001: Supported frontend and deployment baseline

**Status:** Proposed for approval · 17 September 2026

## Context

The supplied brief names Next.js/React/Tailwind and DirectAdmin EVO VPS. The repository currently contains a Vite + React SPA in `apps/web-react/`, a static Vercel deployment configuration, Supabase Edge Functions, and deprecated SvelteKit reference code. The product is already multi-tenant and finance-sensitive.

## Decision

Keep Vite + React + TypeScript + Tailwind as the single supported web application and keep Vercel static hosting + Supabase as the supported deployment path until a separately approved migration demonstrates a material business benefit. Treat Next.js and DirectAdmin VPS as alternatives requiring a new ADR.

## Rationale

This minimizes parallel shells, preserves tested routes and deployment evidence, and avoids coupling a security-sensitive migration to a hosting change. Next.js may become justified for SSR, edge rendering or a public marketing surface, but those benefits do not currently outweigh migration and rollback risk for the authenticated operations app.

## Consequences

Teams must not add new production routes to deprecated SvelteKit code. The API boundary should be progressively formalized behind the SPA. If VPS deployment is mandated, produce a threat model, backup/restore design, process supervision, TLS, firewall, patching and rollback plan before changing the release standard.
