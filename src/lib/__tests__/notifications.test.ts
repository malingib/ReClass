import { describe, it, expect } from 'vitest';
import { formatNotificationDate, normalizeNotification, shouldSurfaceToast, surfaceNotificationToast, type NotificationItem } from '../notifications';

const baseNotification = (id: string, priority: 'high' | 'normal' | 'low', read: boolean): NotificationItem => ({
  id,
  title: 'Test notification',
  created_at: '2026-07-15T10:00:00Z',
  priority,
  read,
});
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const notificationMigration = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260805000003_atomic_notification_claims.sql'),
  'utf8',
);
const notificationWorker = readFileSync(
  join(process.cwd(), 'supabase', 'functions', 'notify', 'index.ts'),
  'utf8',
);

describe('notification delivery safety contract', () => {
  it('claims rows with a database transaction and stale-claim recovery', () => {
    expect(notificationMigration).toContain('FOR UPDATE SKIP LOCKED');
    expect(notificationMigration).toContain("status = 'processing'");
    expect(notificationMigration).toContain("claimed_at < now() - interval '5 minutes'");
  });

  it('uses the atomic claim RPC and clears claims on completion', () => {
    expect(notificationWorker).toContain("rpc('claim_notifications'");
    expect(notificationWorker).toContain('claimed_at: null');
  });
});

describe('toast surfacing (dedupe)', () => {
  it('surfaces an unread high-priority notification exactly once per seen set', () => {
    const seen = new Set<string>();
    const n = baseNotification('n-1', 'high', false);
    expect(surfaceNotificationToast(n, seen)).toBe(true);
    // Second attempt in the same session must not re-toast.
    expect(surfaceNotificationToast(n, seen)).toBe(false);
    // A fresh seen set (e.g. a new tab) still dedupes via persisted storage
    // in the browser, but in memory the id is re-checked the same way.
    const otherSeen = new Set(['n-1']);
    expect(surfaceNotificationToast(n, otherSeen)).toBe(false);
  });

  it('never surfaces read or non-high notifications', () => {
    const seen = new Set<string>();
    expect(surfaceNotificationToast(baseNotification('a', 'high', true), seen)).toBe(false);
    expect(surfaceNotificationToast(baseNotification('b', 'normal', false), seen)).toBe(false);
    expect(surfaceNotificationToast(baseNotification('c', 'low', false), seen)).toBe(false);
    expect(seen.size).toBe(0);
  });

  it('shouldSurfaceToast mutates the seen set only when it fires', () => {
    const seen = new Set<string>();
    expect(shouldSurfaceToast({ id: 'x', priority: 'high' as const, read: false }, seen)).toBe(true);
    expect(seen.has('x')).toBe(true);
    expect(shouldSurfaceToast({ id: 'x', priority: 'high' as const, read: false }, seen)).toBe(false);
  });
});

describe('formatNotificationDate', () => {
  it('returns formatted string for valid ISO date', () => {
    const result = formatNotificationDate('2026-07-15T10:30:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns fallback for invalid date', () => {
    const result = formatNotificationDate('not-a-date');
    expect(result).toBe('Recently updated');
  });

  it('handles empty string', () => {
    const result = formatNotificationDate('');
    expect(result).toBe('Recently updated');
  });
});

describe('normalizeNotification', () => {
  it('normalizes a basic notification', () => {
    const raw = { id: 'abc-123', body: 'Test notification', created_at: '2026-07-15T10:00:00Z' };
    const result = normalizeNotification(raw, new Set());

    expect(result.id).toBe('abc-123');
    expect(result.title).toBe('Test notification');
    expect(result.body).toBe('Test notification');
    expect(result.priority).toBe('normal');
    expect(result.read).toBe(false);
  });

  it('assigns high priority for payment-related notifications', () => {
    const raw = { id: '1', body: 'Payment received successfully', created_at: '' };
    const result = normalizeNotification(raw, new Set());
    expect(result.priority).toBe('high');
  });

  it('marks notifications as read from readIds set', () => {
    const raw = { id: 'known-id', body: 'Hello', created_at: '' };
    const result = normalizeNotification(raw, new Set(['known-id']));
    expect(result.read).toBe(true);
  });

  it('falls back to template when body is missing', () => {
    const raw = { id: '1', template: 'Template message', created_at: '' };
    const result = normalizeNotification(raw, new Set());
    expect(result.title).toBe('Template message');
    expect(result.body).toBe('Template message');
  });
});
