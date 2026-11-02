import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Dockerfile.web copies .next/standalone and runs node server.js.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      // The M0 dashboard became the opportunities list in M3.
      { source: "/dashboard", destination: "/opportunities", permanent: true },
      // The consent line on Create account links here; the pages arrive with
      // the M5 privacy work (docs/plans/account-flow-plan.md, section 8, item 18).
      { source: "/terms", destination: "/", permanent: false },
      { source: "/privacy", destination: "/", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Reads src/i18n/request.ts by default.
const withNextIntl = createNextIntlPlugin();

// Sentry wraps outermost. Source maps upload only when SENTRY_AUTH_TOKEN,
// SENTRY_ORG and SENTRY_PROJECT are set at build time; otherwise the plugin
// warns and the build carries on.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
