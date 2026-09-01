/**
 * Circuit breaker implementation for external services
 * Provides resilience against service failures with automatic recovery
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;    // Number of failures before opening circuit
  resetTimeout?: number;        // Time to wait before attempting reset
  monitoringWindow?: number;    // Time window for failure counting
  expectedResponseTime?: number; // Expected response time in ms
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: number;
  successCount: number;
  nextAttemptTime?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private options: Required<CircuitBreakerOptions>;
  private failureTimes: number[] = [];

  constructor(
    private operation: () => Promise<any>,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringWindow: 60000,
      expectedResponseTime: 5000,
      ...options
    };
    
    this.state = {
      state: 'closed',
      failureCount: 0,
      successCount: 0
    };
  }

  async execute(context?: string): Promise<any> {
    const startTime = Date.now();
    
    // Check if circuit is open
    if (this.state.state === 'open') {
      if (this.state.nextAttemptTime && Date.now() < this.state.nextAttemptTime) {
        throw new CircuitBreakerError(
          `Circuit is open. Next attempt at ${new Date(this.state.nextAttemptTime).toISOString()}`,
          'OPEN_CIRCUIT',
          this.state
        );
      } else {
        // Move to half-open state for testing
        this.state.state = 'half-open';
        this.state.failureCount = 0;
        console.log(`[CircuitBreaker] Moving to half-open state for ${context || 'operation'}`);
      }
    }

    try {
      const result = await this.operation();
      
      // Record success
      this.recordSuccess();
      
      // Check if response time is acceptable
      const responseTime = Date.now() - startTime;
      if (responseTime > this.options.expectedResponseTime) {
        console.warn(`[CircuitBreaker] Slow response: ${responseTime}ms for ${context || 'operation'}`);
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    this.state.successCount++;
    this.state.failureCount = 0;
    
    if (this.state.state === 'half-open') {
      // Close circuit after successful half-open attempt
      this.state.state = 'closed';
      this.state.successCount = 0;
      console.log(`[CircuitBreaker] Circuit closed after successful recovery`);
    }
  }

  private recordFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    this.failureTimes.push(Date.now());
    
    // Clean up old failure times
    const cutoff = Date.now() - this.options.monitoringWindow;
    this.failureTimes = this.failureTimes.filter(time => time > cutoff);
    
    if (this.state.failureCount >= this.options.failureThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state.state = 'open';
    this.state.nextAttemptTime = Date.now() + this.options.resetTimeout;
    console.error(`[CircuitBreaker] Circuit opened after ${this.state.failureCount} failures`);
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  getFailureRate(): number {
    if (this.failureTimes.length === 0) return 0;
    return this.failureTimes.length / Math.max(1, this.failureTimes.length);
  }

  reset(): void {
    this.state = {
      state: 'closed',
      failureCount: 0,
      successCount: 0
    };
    this.failureTimes = [];
    console.log(`[CircuitBreaker] Circuit manually reset`);
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public code: string,
    public state: CircuitBreakerState
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// Pre-configured circuit breakers for common services
export const createDarajaCircuitBreaker = (operation: () => Promise<any>) => {
  return new CircuitBreaker(operation, {
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
    expectedResponseTime: 10000 // 10 seconds
  });
};

export const createMobiwaveCircuitBreaker = (operation: () => Promise<any>) => {
  return new CircuitBreaker(operation, {
    failureThreshold: 5,
    resetTimeout: 300000, // 5 minutes
    monitoringWindow: 600000, // 10 minutes
    expectedResponseTime: 5000 // 5 seconds
  });
};

export const createDatabaseCircuitBreaker = (operation: () => Promise<any>) => {
  return new CircuitBreaker(operation, {
    failureThreshold: 10,
    resetTimeout: 10000, // 10 seconds
    monitoringWindow: 300000, // 5 minutes
    expectedResponseTime: 2000 // 2 seconds
  });
};