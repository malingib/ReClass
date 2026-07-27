const ALLOWED_ORIGINS = [
  Deno.env.get('PUBLIC_URL') ?? '',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://app.reclass.co.ke',   // production
  'https://staging.reclass.co.ke', // staging
].filter(Boolean);

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
  };
}

/** Sentinel headers for fallback (no real request context). */
export const fallbackCorsHeaders = getCorsHeaders(new Request('http://localhost'));
