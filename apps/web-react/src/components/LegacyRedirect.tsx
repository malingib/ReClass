import { Navigate, useLocation } from 'react-router-dom';
import { Stub } from '@/pages/Stub';
import { resolveLegacyRedirect } from '@/lib/legacyRedirects';

/**
 * Serves the legacy redirect table behind scoped `/*` routes.
 * Known legacy paths Navigate to their canonical target; truly unknown
 * paths render the same Not-found stub as the global fallback.
 */
export function LegacyRedirect() {
  const { pathname } = useLocation();
  const target = resolveLegacyRedirect(pathname);
  if (target) return <Navigate to={target} replace />;
  return <Stub title="Not found" />;
}
