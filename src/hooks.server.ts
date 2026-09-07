import type { Handle, HandleServerError } from '@sveltejs/kit';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import { validateEnv, initClients, resolveSession, correlationId, securityHeaders, routeGuard, healthCheck } from '$lib/server/_auth/middleware';
import { metricsCollector } from '$lib/monitoring';

validateEnv();

export const handle: Handle = async ({ event, resolve }) => {
  const requestStartedAt = Date.now();
  const authStartedAt = requestStartedAt;
  metricsCollector.incrementCounter('api_requests');
  initClients(event);
  correlationId(event);
  const healthResponse = await healthCheck(event);
  if (healthResponse) return healthResponse;
  try {
    await resolveSession(event);
    securityHeaders(event);
    routeGuard(event);
    metricsCollector.endTimer('auth_duration', authStartedAt);
    const response = await resolve(event);
    metricsCollector.endTimer('request_duration', requestStartedAt);
    return response;
  } catch (error) {
    metricsCollector.incrementCounter('auth_failures');
    metricsCollector.incrementCounter('error_count');
    metricsCollector.endTimer('request_duration', requestStartedAt);
    throw error;
  }
};

const sentryHandleError = handleErrorWithSentry();
export const handleError: HandleServerError = async (input) => {
  metricsCollector.incrementCounter('error_count');
  console.error('Application error:', input.error);
  return sentryHandleError(input);
};
