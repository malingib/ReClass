/**
 * Lightweight server-side monitoring helpers.
 *
 * IMPORTANT: Vercel instances are ephemeral. These counters are diagnostic
 * only; durable business/audit telemetry belongs in the database and errors
 * belong in Sentry. Never use this module as a source of financial truth.
 */

export interface Metrics {
  stk_init_duration: number[];
  stk_callback_duration: number[];
  stk_failures: number;
  stk_successes: number;
  db_query_duration: number[];
  db_slow_queries: number;
  daraja_duration: number[];
  daraja_failures: number;
  mobiwave_duration: number[];
  mobiwave_failures: number;
  notification_duration: number[];
  notification_failures: number;
  notification_successes: number;
  auth_duration: number[];
  auth_failures: number;
  api_requests: number;
  error_count: number;
}

const createMetrics = (): Metrics => ({
  stk_init_duration: [],
  stk_callback_duration: [],
  stk_failures: 0,
  stk_successes: 0,
  db_query_duration: [],
  db_slow_queries: 0,
  daraja_duration: [],
  daraja_failures: 0,
  mobiwave_duration: [],
  mobiwave_failures: 0,
  notification_duration: [],
  notification_failures: 0,
  notification_successes: 0,
  auth_duration: [],
  auth_failures: 0,
  api_requests: 0,
  error_count: 0,
});

let metrics = createMetrics();

const SLOW_QUERY_THRESHOLD = 1000;
const METRICS_MAX_SIZE = 1000;

export class MetricsCollector {
  private recordDuration(metricName: keyof Metrics, duration: number): void {
    this.recordMetric(metricName, duration);
  }

  /** Deprecated compatibility API. Prefer monitorAsyncOperation for timings. */
  startTimer(): number {
    return Date.now();
  }

  /** Deprecated compatibility API. Accepts a start timestamp when supplied. */
  endTimer(metricName: keyof Metrics, startTime = Date.now()): void {
    this.recordDuration(metricName, Math.max(0, Date.now() - startTime));
  }

  recordMetric(metricName: keyof Metrics, value: number): void {
    const current = metrics[metricName];
    if (Array.isArray(current)) {
      current.push(value);
      if (current.length > METRICS_MAX_SIZE) current.shift();
      return;
    }
    if (typeof current === 'number') {
      (metrics as unknown as Record<string, number>)[metricName] = current + value;
    }
  }

  incrementCounter(metricName: keyof Metrics): void {
    if (typeof metrics[metricName] === 'number') {
      (metrics as unknown as Record<string, number>)[metricName]++;
    }
  }

  getMetrics(): Metrics {
    return {
      ...metrics,
      stk_init_duration: [...metrics.stk_init_duration],
      stk_callback_duration: [...metrics.stk_callback_duration],
      db_query_duration: [...metrics.db_query_duration],
      daraja_duration: [...metrics.daraja_duration],
      mobiwave_duration: [...metrics.mobiwave_duration],
      notification_duration: [...metrics.notification_duration],
      auth_duration: [...metrics.auth_duration],
    };
  }

  getMetricAverage(metricName: keyof Metrics): number {
    const values = metrics[metricName];
    if (!Array.isArray(values) || values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  getMetricSummary(): string {
    const summary = {
      'STK Init Avg': `${this.getMetricAverage('stk_init_duration').toFixed(2)}ms`,
      'STK Callback Avg': `${this.getMetricAverage('stk_callback_duration').toFixed(2)}ms`,
      'Daraja Avg': `${this.getMetricAverage('daraja_duration').toFixed(2)}ms`,
      'Mobiwave Avg': `${this.getMetricAverage('mobiwave_duration').toFixed(2)}ms`,
      'DB Query Avg': `${this.getMetricAverage('db_query_duration').toFixed(2)}ms`,
      'Slow Queries': metrics.db_slow_queries,
      'STK Success Rate': `${((metrics.stk_successes / (metrics.stk_successes + metrics.stk_failures)) * 100 || 0).toFixed(1)}%`,
      'Notification Success Rate': `${((metrics.notification_successes / (metrics.notification_successes + metrics.notification_failures)) * 100 || 0).toFixed(1)}%`,
      'Total Errors': metrics.error_count,
    };
    return Object.entries(summary).map(([key, value]) => `${key}: ${value}`).join('\n');
  }

  reset(): void {
    metrics = createMetrics();
  }
}

export const metricsCollector = new MetricsCollector();

export async function monitorAsyncOperation<T>(
  operation: () => Promise<T>,
  metricName: keyof Metrics,
  errorMetric?: keyof Metrics,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await operation();
    metricsCollector.endTimer(metricName, startedAt);
    return result;
  } catch (error) {
    if (errorMetric) metricsCollector.incrementCounter(errorMetric);
    metricsCollector.incrementCounter('error_count');
    throw error;
  }
}

export async function monitorDatabaseQuery<T>(
  query: () => Promise<T>,
  queryName: string,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await query();
    const duration = Math.max(0, Date.now() - startedAt);
    metricsCollector.recordMetric('db_query_duration', duration);
    if (duration > SLOW_QUERY_THRESHOLD) {
      metricsCollector.incrementCounter('db_slow_queries');
      console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }
    return result;
  } catch (error) {
    metricsCollector.incrementCounter('error_count');
    throw error;
  }
}

type CircuitState = { failures: number; lastFailureTime: number; open: boolean };
const circuits = new Map<string, CircuitState>();

/**
 * Process-local circuit breaker. This protects a single warm server instance;
 * durable outage state should be handled by the queue/provider layer.
 */
export async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  serviceName: string,
  options: { failureThreshold?: number; resetTimeout?: number; monitoringWindow?: number } = {},
): Promise<T> {
  const failureThreshold = options.failureThreshold ?? 5;
  const resetTimeout = options.resetTimeout ?? 30_000;
  const monitoringWindow = options.monitoringWindow ?? 60_000;
  const now = Date.now();
  const state = circuits.get(serviceName) ?? { failures: 0, lastFailureTime: 0, open: false };

  if (state.lastFailureTime && now - state.lastFailureTime > monitoringWindow) {
    state.failures = 0;
    state.open = false;
  }
  if (state.open && now - state.lastFailureTime <= resetTimeout) {
    throw new Error(`${serviceName} is currently unavailable (circuit open)`);
  }
  if (state.open) state.open = false;

  try {
    const result = await operation();
    state.failures = 0;
    state.open = false;
    circuits.set(serviceName, state);
    return result;
  } catch (error) {
    state.failures += 1;
    state.lastFailureTime = Date.now();
    if (state.failures >= failureThreshold) {
      state.open = true;
      console.warn(`Circuit breaker opened for ${serviceName} after ${state.failures} failures`);
    }
    circuits.set(serviceName, state);
    metricsCollector.incrementCounter('error_count');
    throw error;
  }
}
