import { getUserClient } from './supabase.ts';

/**
 * Constant-time comparison of an expected secret against the supplied value.
 * Hashes both sides with SHA-256 and compares digests, so length and value
 * timing do not leak. Falls back to a plain comparison where WebCrypto is
 * unavailable.
 */
export async function verifySecret(actual: string, expected: string): Promise<boolean> {
  const actualBytes = new TextEncoder().encode(actual);
  const expectedBytes = new TextEncoder().encode(expected);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const a = new Uint8Array(await crypto.subtle.digest('SHA-256', actualBytes));
    const b = new Uint8Array(await crypto.subtle.digest('SHA-256', expectedBytes));
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }
  return actual === expected;
}

export interface VerifiedUser {
  id: string;
  email?: string;
}

/**
 * Extract and verify a Bearer token from the Authorization header.
 * Returns the verified user or null if invalid/missing.
 */
export async function verifyAuth(authorization: string | null): Promise<VerifiedUser | null> {
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const client = getUserClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? undefined };
}

/**
 * Convenience: verify the caller is an admin (school_admin or super_admin).
 * Returns the user + matching roles or null.
 */
export async function verifyAdmin(
  authorization: string | null,
  serviceClient: ReturnType<typeof getUserClient>,
): Promise<{ user: VerifiedUser; roles: { role: string; tenant_id: string }[] } | null> {
  const user = await verifyAuth(authorization);
  if (!user) return null;

  const { data: roles } = await serviceClient
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id);

  const isAdmin = roles?.some(r => r.role === 'school_admin' || r.role === 'super_admin');
  if (!isAdmin) return null;

  return { user, roles: roles ?? [] };
}
