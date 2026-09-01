# Monitoring and Health Check Documentation

## Overview

This document describes the new monitoring and health check features implemented to improve system reliability and performance. The implementation includes health check endpoints, circuit breakers, metrics collection, and optimized database queries.

## New Features

### 1. Health Check Endpoints

#### Full Health Check (`/api/health`)

Provides comprehensive system health status including database, external services, and overall system health.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "database": {
      "status": "healthy|degraded|unhealthy",
      "responseTime": 123,
      "details": { "tenantId": "11111111-..." }
    },
    "daraja": {
      "status": "healthy|degraded|unhealthy", 
      "responseTime": 456,
      "details": { "hasCredentials": true }
    },
    "mobiwave": {
      "status": "healthy|degraded|unhealthy",
      "responseTime": 789,
      "details": { "hasCredentials": true }
    },
    "storage": {
      "status": "healthy|degraded|unhealthy",
      "responseTime": 321
    }
  },
  "timestamp": "2026-08-20T10:00:00.000Z",
  "uptime": 3600000,
  "metrics": {
    "summary": "STK Init Avg: 150.00ms\nSTK Callback Avg: 200.00ms\n...",
    "counts": {
      "api_requests": 1000,
      "error_count": 5,
      "stk_failures": 2,
      "stk_successes": 98,
      "notification_failures": 1,
      "notification_successes": 150
    }
  }
}
```

**Status Definitions:**
- `healthy`: All checks passing
- `degraded`: Some checks have issues but system is functional
- `unhealthy`: Critical checks failing, system impaired

#### Quick Health Check (`/api/health/quick`)

Lightweight health check that only verifies database connectivity.

**Endpoint:** `GET /api/health/quick`

**Response:**
```json
{
  "status": "healthy|unhealthy",
  "checks": {
    "database": { "status": "healthy|unhealthy", "responseTime": 123 },
    "daraza": { "status": "healthy" },
    "mobiwave": { "status": "healthy" },
    "storage": { "status": "healthy" }
  },
  "timestamp": "2026-08-20T10:00:00.000Z",
  "uptime": 3600000
}
```

### 2. Circuit Breakers

Implemented for external services to prevent cascading failures.

#### Daraja Circuit Breaker
- **Failure Threshold:** 3 failures
- **Reset Timeout:** 60 seconds
- **Monitoring Window:** 5 minutes
- **Expected Response Time:** 10 seconds

#### Mobiwave Circuit Breaker
- **Failure Threshold:** 5 failures
- **Reset Timeout:** 5 minutes
- **Monitoring Window:** 10 minutes
- **Expected Response Time:** 5 seconds

#### Database Circuit Breaker
- **Failure Threshold:** 10 failures
- **Reset Timeout:** 10 seconds
- **Monitoring Window:** 5 minutes
- **Expected Response Time:** 2 seconds

#### Behavior
- **Closed State:** Normal operation, requests pass through
- **Open State:** Requests fail immediately with "Circuit is open" error
- **Half-Open State:** One test request allowed to check if service has recovered

### 3. Metrics Collection

Critical system metrics are collected and available via health check endpoint.

#### Tracked Metrics
- **STK Flow**: Init duration, callback duration, success/failure counts
- **Database**: Query duration, slow query count
- **External Services**: Daraja and Mobiwave response times and failures
- **Notifications**: Duration, success/failure counts
- **Authentication**: Duration, failure counts
- **General**: API requests, total errors

#### Metrics Access
Metrics are available via the health check endpoint `/api/health` in the `metrics` section.

### 4. Optimized Database Queries

Principal dashboard queries have been optimized to reduce database round-trips.

#### Before (Multiple Queries)
- Students count: 1 query
- Teachers count: 1 query  
- Sessions count: 1 query
- Attendance due: 1 query
- Attendance delivered: 1 query
- Pending attendance: 1 query
- **Total: 6 queries**

#### After (Batched Queries)
- Dashboard counts: 1 RPC call
- Attendance overview: 1 RPC call
- SIS stats: 1 view query
- Pending attendance: 1 limited query
- **Total: 3 operations**

#### Performance Improvement
- **Expected Reduction:** 50-70% query time
- **Expected Improvement:** Response time from 500-1000ms to 200-400ms

### 5. Pending Checkout Cleanup

Automatic cleanup of pending STK checkout requests that timeout.

#### Cleanup Logic
- **Timeout:** 30 minutes in pending state
- **Batch Size:** 100 requests per cleanup
- **Trigger:** Manual endpoint call or scheduled job
- **Status:** Updates to 'failed' with timeout reason

#### Cleanup Endpoint
**Endpoint:** `POST /functions/v1/cleanup-pending-checkouts`

**Response:**
```json
{
  "success": true,
  "cleaned": 5,
  "failed": 0,
  "errors": [],
  "timestamp": "2026-08-20T10:00:00.000Z"
}
```

## Implementation Details

### File Structure

```
src/
├── lib/server/_auth/middleware.ts          # Health check endpoints
├── hooks.server.ts                        # Health check integration
├── lib/server/_platform/
│   ├── dashboard-queries.ts              # Optimized dashboard queries
│   └── monitoring.ts                     # Metrics collection
└── lib/health.ts                          # Health check utilities

supabase/
├── functions/
│   ├── stk/index.ts                      # STK with circuit breaker
│   ├── mpesa-callback/index.ts           # Callback monitoring
│   ├── notify/index.ts                   # Notification circuit breaker
│   └── cleanup-pending-checkouts/        # Cleanup function
└── migrations/
    └── 20260820010000_optimize_dashboard_queries.sql  # DB optimization

packages/shared/src/lib/
├── constants.ts                          # Status enums
├── circuit-breaker.ts                   # Circuit breaker implementation
└── monitoring.ts                         # Metrics collection
```

### Database Changes

#### New RPC Functions
- `get_dashboard_counts()` - Batched dashboard counts
- `get_attendance_overview()` - Attendance data with trends
- `create_optimized_dashboard_counts_function()` - Setup marker
- `create_optimized_attendance_function()` - Setup marker
- `create_sis_stats_view()` - Setup marker

#### New View
- `sis_stats_view` - Pre-aggregated SIS statistics

### Status Enums

Centralized status constants for consistency:

```typescript
// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

// Notification Status
export const NOTIFICATION_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
  RETRYING: 'retrying',
  OPTOUT: 'optout'
} as const;

// ... other status enums
```

## Monitoring and Alerting

### Health Check Monitoring
- **Frequency:** Every request (quick check), every 5 minutes (full check)
- **Alerting:** System status changes to 'unhealthy'
- **Logging:** All health check results logged with timestamps

### Metrics Monitoring
- **Collection:** Real-time on critical operations
- **Retention:** Last 1000 measurements per metric
- **Alerting:** 
  - STK failure rate > 10%
  - Database slow queries > 5% of total
  - External service response time > threshold

### Circuit Breaker Monitoring
- **State Changes:** Logged when circuit opens/closes
- **Failure Tracking:** Count and time of failures
- **Recovery Attempts:** Logged when circuit moves to half-open

## Usage Examples

### Health Check in Load Balancer
```nginx
# nginx configuration for health checks
location /api/health/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # Health check interval
    health_check_interval 30s;
    health_check_timeout 5s;
    
    # Mark unhealthy after 3 failures
    health_check_unhealthy_threshold 3;
}
```

### Circuit Breaker Usage
```typescript
import { createDarajaCircuitBreaker } from '$lib/circuit-breaker';

const darajaOperation = async () => {
  const response = await fetch('https://api.safaricom.co.ke/...', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
};

const circuitBreaker = createDarajaCircuitBreaker(darajaOperation);

try {
  const result = await circuitBreaker.execute('STK Payment');
  console.log('Success:', result);
} catch (error) {
  if (error.code === 'OPEN_CIRCUIT') {
    // Circuit is open, use fallback
    console.log('Using fallback payment method');
  } else {
    throw error;
  }
}
```

### Metrics Collection
```typescript
import { metricsCollector } from '$lib/monitoring';

// Track an operation with metrics
const trackOperation = async () => {
  metricsCollector.startTimer();
  
  try {
    const result = await someOperation();
    metricsCollector.endTimer('db_query_duration');
    return result;
  } catch (error) {
    metricsCollector.incrementCounter('error_count');
    throw error;
  }
};
```

## Troubleshooting

### Common Issues

1. **Health Check Returning Degraded**
   - Check external service credentials
   - Verify database connectivity
   - Check network connectivity to external services

2. **Circuit Breaker Stuck Open**
   - Wait for reset timeout
   - Check if external service is actually healthy
   - Manually reset if needed

3. **Metrics Not Updating**
   - Verify monitoring module is imported
   - Check that metrics are being collected in code
   - Review console logs for errors

4. **Optimized Queries Failing**
   - Verify database migration was applied
   - Check if RPC functions exist
   - Review database permissions

### Debug Commands

```bash
# Check current system health
curl -s http://localhost:5173/api/health | jq '.status'

# Check specific service health
curl -s http://localhost:5173/api/health | jq '.checks.daraja'

# Reset metrics (for testing)
curl -X POST http://localhost:5173/api/debug/reset-metrics

# Check circuit breaker state
curl -X POST http://localhost:5173/api/debug/circuit-breaker-state \
  -H "Content-Type: application/json" \
  -d '{"service": "daraja"}'
```

## Performance Considerations

### Health Check Overhead
- Quick check: < 10ms
- Full check: 50-200ms (depending on external services)
- Recommended frequency: Quick check every request, Full check every 5 minutes

### Memory Usage
- Metrics retention: ~1000 measurements per metric
- Circuit breaker state: Minimal overhead
- Health check cache: 30-second TTL for stable data

### Database Impact
- Optimized queries reduce load by 50-70%
- Health checks use minimal database resources
- Cleanup function runs infrequently (can be scheduled)

## Future Enhancements

1. **Advanced Metrics**
   - Custom dashboards
   - Alerting rules
   - Historical data trends

2. **Enhanced Circuit Breakers**
   - Rate limiting integration
   - Custom failure conditions
   - Circuit breaker state persistence

3. **Performance Monitoring**
   - APM integration
   - Distributed tracing
   - Real-time performance alerts

4. **Health Check Enhancements**
   - Dependency health checks
   - Custom health check endpoints
   - Health check result caching

## Conclusion

The new monitoring and health check system provides comprehensive visibility into system health, performance, and reliability. The circuit breakers prevent cascading failures, while the optimized queries improve performance. Health checks provide early detection of issues, allowing for proactive maintenance and improved user experience.

For more information, see the [Testing Guide](./TESTING-GUIDE.md) for detailed test scenarios and validation procedures.