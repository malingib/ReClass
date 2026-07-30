export const COOKIE_USER_TTL_SECONDS = 300;
export const COOKIE_USER_NAME = 'x-reclass-user';
export const COOKIE_IMPERSONATE_NAME = 'x-reclass-impersonate';

export const IMPERSONATION_TTL_MS = 60 * 60 * 1000;

export const EXPORT_MAX_ROWS = 10_000;
export const EXPORT_BURSA_MAX_ROWS = 5_000;

export const PAGE_LIST_LARGE = 100;
export const PAGE_LIST_MEDIUM = 50;
export const PAGE_LIST_SMALL = 10;
export const PAGE_OVERVIEW = 5;

export const WAIVERS_LIST_LIMIT = 100;
export const WAIVERS_SEARCH_LIMIT = 500;

export const NOTIFICATION_RETRY_MAX = 3;

export const ROUTE_LOGIN = '/login';
export const ROUTE_NOT_PROVISIONED = '/not-provisioned';
export const PUBLIC_ROUTES = ['/account', '/notifications', '/api/logout'];

// Content-Security-Policy. SvelteKit hydration + Vite inline the runtime, so
// 'unsafe-inline' is required for scripts/styles until nonce-based CSP is wired.
// connect-src allows the Supabase project (REST/Auth/Realtime) and Sentry ingest.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
