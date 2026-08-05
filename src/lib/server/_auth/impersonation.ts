import { env } from '$env/dynamic/private';
import { IMPERSONATION_TTL_MS } from '$lib/config';

const MIN_SECRET_LENGTH = 32;

function getImpersonationSecret(): string {
  const secret = env.IMPERSONATION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error('IMPERSONATION_SECRET must be set to at least 32 characters.');
  }
  return secret;
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
  const key = await crypto.subtle.importKey('raw', enc.encode(getImpersonationSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return encodeBase64URL(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);

  for (let i = 0; i < len; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return diff === 0;
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

  let json: string;
  try {
    json = atob(rawPayload);
  } catch {
    return null;
  }
  const expectedSig = await hmacSign(json);
  if (!timingSafeEqual(sig, expectedSig)) return null;

  let payload: ImpersonationPayload;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }
  if (Date.now() > payload.expiresAt) return null;
  // Match by /24 prefix instead of exact IP — schools often share NAT and
  // impersonators may switch between mobile data / office WiFi mid-session.
  const ipA = payload.ip.split('.').slice(0, 3).join('.');
  const ipB = currentIp.split('.').slice(0, 3).join('.');
  if (ipA !== ipB) return null;

  return payload.tenantId;
}
