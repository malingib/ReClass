// Re-export parseForm from a server-side path for semantic consistency.
// The function itself has no client-side dependencies and is used in
// +page.server.ts files — importing from $lib/client/validation.ts
// is misleading. Import from $lib/server/validation instead.
export { parseForm } from '$lib/client/validation';
