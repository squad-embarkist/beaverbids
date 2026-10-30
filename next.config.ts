import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Dockerfile.web copies .next/standalone and runs node server.js.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // The M0 dashboard became the opportunities list in M3.
  async redirects() {
    return [{ source: "/dashboard", destination: "/opportunities", permanent: true }];
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
