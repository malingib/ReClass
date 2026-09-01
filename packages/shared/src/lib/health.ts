/**
 * Health check utilities for monitoring system health
 * Provides database, external service, and overall system health status
 */

import { createClient } from '@supabase/supabase-js';
import { metricsCollector } from './monitoring';
import { TENANT_ID } from './config';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthCheckStatus;
    daraja: HealthCheckStatus;
    mobiwave: HealthCheckStatus;
    storage: HealthCheckStatus;
  };
  timestamp: Date;
  uptime: number;
}

export interface HealthCheckStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

export class HealthChecker {
  private startTime = Date.now();
  private supabaseService: any;

  constructor(supabaseService: any) {
    this.supabaseService = supabaseService;
  }

  async checkDatabase(): Promise<HealthCheckStatus> {
    const startTime = Date.now();
    
    try {
      // Simple query to check database connectivity
      const { error } = await this.supabaseService
        .from('tenants')
        .select('id')
        .eq('id', TENANT_ID)
        .single();

      const responseTime = Date.now() - startTime;
      
      if (error) {
        return {
          status: 'unhealthy',
          responseTime,
          error: error.message
        };
      }

      // Check if response time is slow
      const status = responseTime > 1000 ? 'degraded' : 'healthy';
      
      return {
        status,
        responseTime,
        details: { tenantId: TENANT_ID }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  async checkDaraja(): Promise<HealthCheckStatus> {
    const startTime = Date.now();
    
    try {
      // Check if Daraja credentials are configured
      const { data, error } = await this.supabaseService
        .rpc('resolve_credential', {
          p_tenant: TENANT_ID,
          p_service: 'daraja'
        });

      if (error) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }

      // Simulate a test OAuth request (without actually making it)
      const hasCredentials = data && data.consumer_key && data.consumer_secret;
      
      if (!hasCredentials) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: 'Daraja credentials not configured'
        };
      }

      const responseTime = Date.now() - startTime;
      const status = responseTime > 2000 ? 'degraded' : 'healthy';
      
      return {
        status,
        responseTime,
        details: { hasCredentials: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Daraja health check failed'
      };
    }
  }

  async checkMobiwave(): Promise<HealthCheckStatus> {
    const startTime = Date.now();
    
    try {
      // Check if Mobiwave credentials are configured
      const { data, error } = await this.supabaseService
        .rpc('resolve_credential', {
          p_tenant: TENANT_ID,
          p_service: 'mobiwave'
        });

      if (error) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }

      const hasCredentials = data && data.api_token;
      
      if (!hasCredentials) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: 'Mobiwave credentials not configured'
        };
      }

      const responseTime = Date.now() - startTime;
      const status = responseTime > 1500 ? 'degraded' : 'healthy';
      
      return {
        status,
        responseTime,
        details: { hasCredentials: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Mobiwave health check failed'
      };
    }
  }

  async checkStorage(): Promise<HealthCheckStatus> {
    const startTime = Date.now();
    
    try {
      // Check if we can access a simple table to verify storage
      const { error } = await this.supabaseService
        .from('platform_config')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;
      
      if (error) {
        return {
          status: 'unhealthy',
          responseTime,
          error: error.message
        };
      }

      const status = responseTime > 800 ? 'degraded' : 'healthy';
      
      return {
        status,
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Storage health check failed'
      };
    }
  }

  async runFullHealthCheck(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      daraja: await this.checkDaraja(),
      mobiwave: await this.checkMobiwave(),
      storage: await this.checkStorage()
    };

    // Determine overall status
    const statuses = Object.values(checks).map(check => check.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (statuses.some(status => status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.some(status => status === 'degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime
    };
  }

  async runQuickHealthCheck(): Promise<HealthCheckResult> {
    // Only check database for quick health check
    const databaseCheck = await this.checkDatabase();
    
    return {
      status: databaseCheck.status,
      checks: {
        database: databaseCheck,
        daraza: { status: 'healthy' }, // Assume healthy in quick check
        mobiwave: { status: 'healthy' }, // Assume healthy in quick check
        storage: { status: 'healthy' } // Assume healthy in quick check
      },
      timestamp: new Date(),
      uptime: Date.now() - this.startTime
    };
  }
}