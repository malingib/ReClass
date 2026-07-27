import { init } from '@sentry/sveltekit';

init({
  dsn: process.env.PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.PUBLIC_SENTRY_DSN,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
