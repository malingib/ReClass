import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { IMPERSONATION_TTL_MS } from '$lib/config';

const IMPERSONATION_SECRET = process.env['IMPERSONATION_SECRET'] || SUPABASE_SERVICE_ROLE_KEY;
if (!process.env['IMPERSONATION_SECRET']) {
  console.warn('[impersonation] IMPERSONATION_SECRET not set — falling back to SUPABASE_SERVICE_ROLE_KEY. Set IMPERSONATION_SECRET for better security isolation.');
}

export interface ImpersonationPayload {
  tenantId: string;
  actorId: string;
  expiresAt: number;
  ip: string;
}

function encodeBase64URL(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSign(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(IMPERSONATION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return encodeBase64URL(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function signImpersonation(tenantId: string, actorId: string, ip: string): Promise<string> {
  const expiresAt = Date.now() + IMPERSONATION_TTL_MS;
  const payload: ImpersonationPayload = { tenantId, actorId, expiresAt, ip };
  const json = JSON.stringify(payload);
  const sig = await hmacSign(json);
  return `${btoa(json).replace(/=+$/, '')}.${sig}`;
}

export async function verifyImpersonation(token: string, currentIp: string): Promise<string | null> {
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const rawPayload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const json = atob(rawPayload);
  const expectedSig = await hmacSign(json);
  if (sig !== expectedSig) return null;

  const payload: ImpersonationPayload = JSON.parse(json);
  if (Date.now() > payload.expiresAt) return null;
  if (payload.ip !== currentIp) return null;

  return payload.tenantId;
}