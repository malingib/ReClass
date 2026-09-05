import { describe, expect, it } from 'vitest';
import { MetricsCollector, monitorAsyncOperation, monitorDatabaseQuery } from '../monitoring';

describe('MetricsCollector', () => {
  it('records a supplied start timestamp without shared timer state', () => {
    const collector = new MetricsCollector();
    const startedAt = Date.now() - 25;
    collector.endTimer('auth_duration', startedAt);
    expect(collector.getMetrics().auth_duration[0]).toBeGreaterThanOrEqual(20);
  });

  it('returns isolated metric snapshots', () => {
    const collector = new MetricsCollector();
    collector.recordMetric('db_query_duration', 10);
    const snapshot = collector.getMetrics();
    snapshot.db_query_duration.push(999);
    expect(collector.getMetrics().db_query_duration).toEqual([10]);
  });
});

describe('monitorAsyncOperation', () => {
  it('records successful operation duration', async () => {
    const collector = new MetricsCollector();
    await monitorAsyncOperation(async () => 'ok', 'stk_init_duration');
    expect(typeof collector.getMetricAverage('stk_init_duration')).toBe('number');
  });
});

describe('monitorDatabaseQuery', () => {
  it('returns the query result', async () => {
    await expect(monitorDatabaseQuery(async () => ({ ok: true }), 'test')).resolves.toEqual({ ok: true });
  });
});
