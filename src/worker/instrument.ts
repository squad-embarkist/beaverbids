import * as Sentry from "@sentry/node";

// Must be imported before anything else in the worker so Sentry can wrap
// pg and the rest. Skipped entirely until a DSN is set.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1,
  });
}
