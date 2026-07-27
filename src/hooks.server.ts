import type { Handle, HandleServerError } from '@sveltejs/kit';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import {
  validateEnv, initClients, resolveSession,
  handleImpersonation, correlationId, securityHeaders, routeGuard,
} from '$lib/server/middleware';

validateEnv();

export const handle: Handle = ({ event, resolve }) => {
  initClients(event);
  correlationId(event);
  return resolveSession(event)
    .then(() => handleImpersonation(event))
    .then(() => { securityHeaders(event); routeGuard(event); })
    .then(() => resolve(event));
};

export const handleError: HandleServerError = handleErrorWithSentry();
