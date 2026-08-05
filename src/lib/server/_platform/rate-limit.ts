import type { SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetIn: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  global: { windowMs: 60_000, max: 120 },
  login: { windowMs: 60_000, max: 5 },
  stk: { windowMs: 60_000, max: 3 },
  sms: { windowMs: 60_000, max: 10 },
};

/**
 * Distributed rate limit backed by Postgres (rate_limit_hit RPC). Shared across
 * all serverless instances and durable across cold starts. Authentication and
 * provider-triggering namespaces fail closed when the limiter is unavailable.
 */
export async function checkRateLimit(
  srv: SupabaseClient,
  key: string,
  namespace = 'global',
  config?: RateLimitConfig,
  tenantId?: string,
): Promise<RateLimitResult> {
  const cfg = config ?? RATE_LIMITS[namespace] ?? RATE_LIMITS.global;
  // Scope rate-limit key by tenant when available, so a burst at one school
  // doesn't penalise another behind the same NAT IP.
  const bucketKey = tenantId ? `${namespace}:${tenantId}:${key}` : `${namespace}:${key}`;

  try {
    const { data, error } = await srv.rpc('rate_limit_hit', {
      p_key: bucketKey,
      p_max: cfg.max,
      p_window_ms: cfg.windowMs,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      return unavailableResult(namespace, cfg);
    }
    return {
      allowed: row.allowed,
      limit: cfg.max,
      remaining: row.remaining,
      resetIn: row.reset_in_ms,
    };
  } catch (err) {
    console.error('[rate-limit] checkRateLimit error:', err);
    return unavailableResult(namespace, cfg);
  }
}

function unavailableResult(namespace: string, config: RateLimitConfig): RateLimitResult {
  const failClosed = namespace === 'login' || namespace === 'stk' || namespace === 'sms';
  return {
    allowed: !failClosed,
    limit: config.max,
    remaining: failClosed ? 0 : config.max,
    resetIn: config.windowMs,
  };
}

export function rateLimitedHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
  };
}
