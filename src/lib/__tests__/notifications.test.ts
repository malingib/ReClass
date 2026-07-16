import { describe, it, expect } from 'vitest';
import { formatNotificationDate, normalizeNotification } from '../notifications';

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
