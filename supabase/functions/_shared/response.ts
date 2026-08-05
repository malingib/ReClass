import { getCorsHeaders, fallbackCorsHeaders } from './cors.ts';

// ── Response helpers ───────────────────────────────────────────────────────

/** Build a JSON response. Omitting `req` uses fallback CORS headers. */
export function json(
  body: Record<string, unknown>,
  status = 200,
  req?: Request,
): Response {
  const headers = req ? getCorsHeaders(req) : fallbackCorsHeaders;
  return new Response(JSON.stringify(body), { status, headers });
}

/** 200 OK helper. */
export function ok(body: Record<string, unknown>, req?: Request): Response {
  return json(body, 200, req);
}

/** Error response with `{ error: code }` shape. */
export function error(code: string, status: number, req?: Request): Response {
  return json({ error: code } as Record<string, unknown>, status, req);
}

/** 401 Unauthorized. */
export function unauthorized(req?: Request): Response {
  return error('UNAUTHORIZED', 401, req);
}

/** 403 Forbidden. */
export function forbidden(req?: Request): Response {
  return error('FORBIDDEN', 403, req);
}

/** 400 Bad Request. */
export function badRequest(code: string, req?: Request): Response {
  return error(code, 400, req);
}

/** 404 Not Found. */
export function notFound(code = 'NOT_FOUND', req?: Request): Response {
  return error(code, 404, req);
}

/** 500 Internal Server Error. */
export function internalError(req?: Request): Response {
  return error('INTERNAL_ERROR', 500, req);
}

/** CORS preflight handler — returns 200 with CORS headers. */
export function handleOptions(req: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(req) });
}
