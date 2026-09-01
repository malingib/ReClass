/**
 * Monitoring and metrics collection for critical paths
 * Provides performance tracking and error counting
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface Metrics {
  // STK Payment Flow
  stk_init_duration: number[];
  stk_callback_duration: number[];
  stk_failures: number;
  stk_successes: number;
  
  // Database Performance
  db_query_duration: number[];
  db_slow_queries: number;
  
  // External Services
  daraja_duration: number[];
  daraja_failures: number;
  mobiwave_duration: number[];
  mobiwave_failures: number;
  
  // Notifications
  notification_duration: number[];
  notification_failures: number;
  notification_successes: number;
  
  // Authentication
  auth_duration: number[];
  auth_failures: number;
  
  // General
  api_requests: number;
  error_count: number;
}

// Global metrics instance
let metrics: Metrics = {
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
};

// Configuration
const SLOW_QUERY_THRESHOLD = 1000; // 1 second
const METRICS_MAX_SIZE = 1000; // Keep last 1000 measurements

export class MetricsCollector {
  private startTime: number = 0;

  startTimer(): void {
    this.startTime = Date.now();
  }

  endTimer(metricName: keyof Metrics): void {
    const duration = Date.now() - this.startTime;
    this.recordMetric(metricName, duration);
  }

  recordMetric(metricName: keyof Metrics, value: number): void {
    if (Array.isArray(metrics[metricName])) {
      const array = metrics[metricName] as number[];
      array.push(value);
      if (array.length > METRICS_MAX_SIZE) {
        array.shift(); // Remove oldest entry
      }
    } else {
      metrics[metricName] += value;
    }
  }

  incrementCounter(metricName: keyof Metrics): void {
    if (typeof metrics[metricName] === 'number') {
      metrics[metricName]++;
    }
  }

  getMetrics(): Metrics {
    return { ...metrics };
  }

  getMetricAverage(metricName: keyof Metrics): number {
    const values = metrics[metricName];
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }
    return values.reduce((sum, val) => sum + val, 0) / values.length;
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
    
    return Object.entries(summary)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  reset(): void {
    metrics = {
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
    };
  }
}

// Global instance
export const metricsCollector = new MetricsCollector();

// Utility functions for common monitoring patterns
export function monitorAsyncOperation<T>(
  operation: () => Promise<T>,
  metricName: keyof Metrics,
  errorMetric?: keyof Metrics
): Promise<T> {
  metricsCollector.startTimer();
  return operation()
    .then((result) => {
      metricsCollector.endTimer(metricName);
      return result;
    })
    .catch((error) => {
      if (errorMetric) {
        metricsCollector.incrementCounter(errorMetric);
      }
      metricsCollector.incrementCounter('error_count');
      throw error;
    });
}

export function monitorDatabaseQuery<T>(
  query: () => Promise<T>,
  queryName: string
): Promise<T> {
  metricsCollector.startTimer();
  return query()
    .then((result) => {
      const duration = Date.now() - metricsCollector['startTime'];
      metricsCollector.recordMetric('db_query_duration', duration);
      
      if (duration > SLOW_QUERY_THRESHOLD) {
        metricsCollector.incrementCounter('db_slow_queries');
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }
      
      return result;
    })
    .catch((error) => {
      metricsCollector.incrementCounter('error_count');
      throw error;
    });
}

export function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  serviceName: string,
  options: {
    failureThreshold?: number;
    resetTimeout?: number;
    monitoringWindow?: number;
  } = {}
): Promise<T> {
  const {
    failureThreshold = 5,
    resetTimeout = 30000,
    monitoringWindow = 60000
  } = options;

  // Simple circuit breaker implementation
  let failures = 0;
  let lastFailureTime = 0;
  let isCircuitOpen = false;

  return new Promise((resolve, reject) => {
    if (isCircuitOpen) {
      if (Date.now() - lastFailureTime > resetTimeout) {
        isCircuitOpen = false;
        failures = 0;
      } else {
        reject(new Error(`${serviceName} is currently unavailable (circuit open)`));
        return;
      }
    }

    operation()
      .then((result) => {
        failures = 0;
        resolve(result);
      })
      .catch((error) => {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          isCircuitOpen = true;
          console.warn(`Circuit breaker opened for ${serviceName} after ${failures} failures`);
        }
        
        metricsCollector.incrementCounter('error_count');
        reject(error);
      });
  });
}