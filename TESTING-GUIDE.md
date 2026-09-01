# Implementation Testing Guide

This guide provides comprehensive test scenarios for the implemented improvements including health checks, monitoring, circuit breakers, and optimized queries.

## Test Scenarios

### 1. Health Check Endpoints

#### Full Health Check (`/api/health`)
```bash
curl -X GET http://localhost:5173/api/health
```

**Expected Response:**
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

#### Quick Health Check (`/api/health/quick`)
```bash
curl -X GET http://localhost:5173/api/health/quick
```

**Expected Response:**
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

### 2. Circuit Breaker Testing

#### Daraja Service Failure Simulation
```javascript
// Test script to simulate Daraja failures
const testDarajaFailures = async () => {
  // Simulate multiple failures to trigger circuit breaker
  for (let i = 0; i < 5; i++) {
    try {
      await fetch('/api/stk', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({ fee_type_id: 'test', student_id: 'test' })
      });
      console.log(`Attempt ${i + 1}: Success`);
    } catch (error) {
      console.log(`Attempt ${i + 1}: Failed - ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

// After 5 failures, circuit breaker should open
// Next requests should fail with: "Circuit is open"
```

#### Mobiwave Circuit Breaker Test
```javascript
// Test Mobiwave SMS failures
const testMobiwaveFailures = async () => {
  // Simulate SMS service failures
  for (let i = 0; i < 8; i++) {
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({ 
          channel: 'sms', 
          body: 'Test message',
          phone: '254712345678'
        })
      });
      console.log(`SMS Attempt ${i + 1}: Success`);
    } catch (error) {
      console.log(`SMS Attempt ${i + 1}: Failed - ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};
```

### 3. Monitoring Metrics Testing

#### STK Payment Flow Monitoring
```javascript
// Test STK flow and verify metrics
const testSTKMonitoring = async () => {
  const startTime = Date.now();
  
  try {
    const response = await fetch('/api/stk', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({ 
        fee_type_id: 'test-fee-id', 
        student_id: 'test-student-id' 
      })
    });
    
    const duration = Date.now() - startTime;
    console.log(`STK Init Duration: ${duration}ms`);
    
    const data = await response.json();
    if (data.metrics) {
      console.log('STK Metrics:', data.metrics);
    }
  } catch (error) {
    console.error('STK Test Failed:', error);
  }
};
```

#### Database Performance Monitoring
```javascript
// Test dashboard query performance
const testDashboardPerformance = async () => {
  const startTime = Date.now();
  
  const response = await fetch('/principal', {
    headers: { 'Authorization': 'Bearer test-token' }
  });
  
  const duration = Date.now() - startTime;
  console.log(`Dashboard Load Time: ${duration}ms`);
  
  // Check if response contains expected data
  const data = await response.json();
  console.log('Dashboard Stats:', data.stats);
  console.log('SIS Data:', data.sis);
};
```

### 4. Optimized Query Testing

#### Principal Dashboard Performance
```bash
# Test dashboard load time
curl -X GET http://localhost:5173/principal \
  -H "Authorization: Bearer test-token" \
  -w "Time: %{time_total}s\nSize: %{size_download} bytes\n"

# Expected improvement: Should be faster than previous implementation
# Previous: ~500-1000ms for multiple queries
# Optimized: ~200-400ms for single batched query
```

#### Database Query Analysis
```sql
-- Monitor query performance in Supabase
-- Run this in the Supabase dashboard to see query times

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor dashboard query specifically
SELECT query, calls, total_time, rows
FROM pg_stat_statements
WHERE query LIKE '%get_dashboard_counts%'
ORDER BY total_time DESC;
```

### 5. Pending Checkout Cleanup Testing

#### Test Cleanup Function
```bash
# Manually trigger the cleanup function
curl -X POST http://localhost:5173/functions/v1/cleanup-pending-checkouts \
  -H "Content-Type: application/json" \
  -w "Status: %{http_code}\n"

# Expected Response:
# {
#   "success": true,
#   "cleaned": 5,
#   "failed": 0,
#   "errors": []
# }
```

#### Simulate Pending Checkouts
```javascript
// Create test pending checkouts to verify cleanup
const createPendingCheckouts = async () => {
  const oldDate = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
  
  for (let i = 0; i < 3; i++) {
    await fetch('/api/stk', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({ 
        fee_type_id: 'test-fee-' + i, 
        student_id: 'test-student-' + i 
      })
    });
  }
  
  console.log('Created 3 pending checkouts');
};
```

### 6. Error Handling Testing

#### Authentication Failure Monitoring
```javascript
// Test authentication failures are tracked
const testAuthFailures = async () => {
  for (let i = 0; i < 3; i++) {
    try {
      await fetch('/protected-route', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
    } catch (error) {
      console.log(`Auth failure ${i + 1}: ${error.message}`);
    }
  }
  
  // Check metrics for auth failures
  const healthResponse = await fetch('/api/health');
  const healthData = await healthResponse.json();
  console.log('Auth failures in metrics:', healthData.metrics.counts.auth_failures);
};
```

#### Database Error Handling
```javascript
// Test database error handling
const testDatabaseErrors = async () => {
  try {
    // This should fail gracefully
    await fetch('/api/endpoint-that-fails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({ invalid_data: true })
    });
  } catch (error) {
    console.log('Database error handled:', error.message);
  }
};
```

## Automated Testing

### Test Script
```javascript
// comprehensive-test.js
const testSuite = async () => {
  console.log('Starting comprehensive test suite...');
  
  // 1. Health checks
  console.log('\n1. Testing health checks...');
  await testHealthChecks();
  
  // 2. Circuit breakers
  console.log('\n2. Testing circuit breakers...');
  await testCircuitBreakers();
  
  // 3. Monitoring
  console.log('\n3. Testing monitoring...');
  await testMonitoring();
  
  // 4. Performance
  console.log('\n4. Testing performance...');
  await testPerformance();
  
  // 5. Error handling
  console.log('\n5. Testing error handling...');
  await testErrorHandling();
  
  console.log('\nTest suite completed!');
};

// Run the test suite
testSuite().catch(console.error);
```

### Performance Benchmarking
```javascript
// benchmark.js
const benchmark = async () => {
  const iterations = 100;
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fetch('/principal', { headers: { 'Authorization': 'Bearer test-token' } });
    const duration = Date.now() - start;
    results.push(duration);
  }
  
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);
  
  console.log(`Performance Benchmark (${iterations} iterations):`);
  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`Min: ${min}ms`);
  console.log(`Max: ${max}ms`);
  console.log(`95th percentile: ${percentile(results, 95).toFixed(2)}ms`);
};

function percentile(arr, p) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}
```

## Validation Checklist

- [ ] Health check endpoints return correct status codes
- [ ] Circuit breakers open/close correctly
- [ ] Metrics are collected and reported accurately
- [ ] Dashboard queries are faster than before
- [ ] Error handling is graceful and tracked
- [ ] Pending checkouts are cleaned up automatically
- [ ] All external services have proper circuit breakers
- [ ] Performance benchmarks meet expectations

## Troubleshooting

### Common Issues

1. **Circuit Breaker Not Resetting**
   - Check if the reset timeout is configured correctly
   - Verify the service is actually healthy before reset

2. **Metrics Not Updating**
   - Ensure the monitoring module is imported correctly
   - Check that `metricsCollector.incrementCounter()` is called

3. **Optimized Queries Failing**
   - Verify the database migration was applied
   - Check if the RPC functions exist in the database

4. **Health Checks Failing**
   - Ensure the health checker is properly initialized
   - Check database connectivity and external service credentials

### Debug Commands

```bash
# Check current metrics
curl -X GET http://localhost:5173/api/health | jq '.metrics.summary'

# Check circuit breaker state
curl -X POST http://localhost:5173/api/debug/circuit-breaker-state \
  -H "Content-Type: application/json" \
  -d '{"service": "daraja"}'

# Reset metrics
curl -X POST http://localhost:5173/api/debug/reset-metrics \
  -H "Content-Type: application/json"
```