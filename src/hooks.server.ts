import type { Handle, HandleServerError } from '@sveltejs/kit';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import {
  validateEnv, initClients, resolveSession,
  correlationId, securityHeaders, routeGuard, healthCheck,
} from '$lib/server/_auth/middleware';
import { metricsCollector } from '$lib/monitoring';

validateEnv();

export const handle: Handle = async ({ event, resolve }) => {
  metricsCollector.incrementCounter('api_requests');
  initClients(event);
  correlationId(event);
  const healthResponse = await healthCheck(event);
  if (healthResponse) return healthResponse;
  
  return resolveSession(event)
    .then(() => { 
      securityHeaders(event); 
      routeGuard(event); 
    })
    .then(() => {
      // Add timing metrics for successful requests
      metricsCollector.endTimer('auth_duration');
      return resolve(event);
    })
    .catch((error) => {
      // Track authentication failures
      metricsCollector.incrementCounter('auth_failures');
      metricsCollector.incrementCounter('error_count');
      throw error;
    });
};

const sentryHandleError = handleErrorWithSentry();
export const handleError: HandleServerError = async (input) => {
  metricsCollector.incrementCounter('error_count');
  console.error('Application error:', input.error);
  return sentryHandleError(input);
};
