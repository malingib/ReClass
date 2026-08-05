import { getUserClient } from './supabase.ts';

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
