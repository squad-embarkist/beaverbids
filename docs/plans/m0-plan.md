# M0 Foundations: build plan

Oct 23, 2026 · Status: built Oct 23, 2026 on feature/m0-foundations; awaiting Coolify setup for the staging deploy

Milestone M0 from docs/development-guide.md. Done when a user can create an account, sign in and see the empty dashboard, and a merge to staging deploys. Coolify, domains, AWS, Sentry DSNs and the staging server are open items and are not part of this plan.

## What the current official docs changed

Read on Oct 23, 2026. Versions are the latest stable on that date.

| Library | Version | What matters for M0 |
| --- | --- | --- |
| Next.js | 16.4.2 (installed) | Middleware is now `src/proxy.ts`. Cache Components is on, so any component that reads cookies or the database must sit inside a Suspense boundary. Docker uses `output: "standalone"`. `instrumentation.ts` lives in `src/`. |
| Better Auth | 1.7.12 | CLI is `npx auth@latest generate` and merges its User, Session, Account and Verification models into the existing schema. Extra user fields go through `user.additionalFields`. `nextCookies()` must be the last plugin so server actions can set the session cookie. For Next 16 the docs recommend an optimistic cookie check in `proxy.ts` and a real session check in every protected page. Password defaults: 8 to 128 characters, scrypt. No email is sent unless a sender is configured. |
| Prisma | 7.10.1 (installed) | Client is imported from `@/generated/prisma/client` and needs a driver adapter, so `@prisma/adapter-pg` and `pg` are added. One client instance per process. |
| next-intl | 4.14.9 | "App Router without i18n routing" setup. With a hard-coded locale and no cookie read, the request config touches no runtime APIs, so pages stay prerenderable. `NextIntlClientProvider` needs no props in the root layout. A `global.ts` augmentation makes unknown message keys fail typecheck. |
| Sentry | 11.9.0 | `withSentryConfig` is imported from `@sentry/nextjs/config` and wraps outermost around next-intl's plugin. The SDK is a clean no-op when the DSN is unset. The worker uses `@sentry/node` with an `instrument.ts` imported before anything else, and `withMonitor` for the daily cron in M4. |
| pg-boss | 12.38.0 (installed) | `new PgBoss(connectionString)`, `start()`, `createQueue()`, `schedule(name, cron)`, `work()`, `stop({ graceful: true })`. Needs Node 22.12 or newer. |

## Build steps, in order

1. **Branch and dependencies.** Create `feature/m0-foundations` from `development`. Add `better-auth`, `@prisma/adapter-pg`, `pg`, `next-intl`, `@sentry/node`, `zod`, `dotenv`; dev: `@types/pg`. Add scripts `db:generate` (prisma generate) and `db:deploy` (prisma migrate deploy). Add `vitest.config.ts` with the `@/` alias.
2. **Folder layout.** Create `src/lib` (db singleton, auth, auth-client, env, zod schemas), `src/worker` (`instrument.ts`, `index.ts`, `jobs/ingest`, `jobs/scoring`, `jobs/email` placeholders), `src/i18n`, `messages/`, `fixtures/`, `docs/permissions/`. The worker connects pg-boss to Postgres, creates a `heartbeat` queue, schedules it every minute, logs each beat, and stops cleanly on SIGTERM and SIGINT.
3. **Database.** Set the local `DATABASE_URL` for the compose Postgres, run the Better Auth generator, add `language`, `digestOptIn` and `digestConsentAt` to the user model, create the first migration, generate the client.
4. **Design tokens and fonts.** Put the colours, radii and type scale from docs/ui-ux-guide.md into `src/app/globals.css` as CSS variables mapped into Tailwind's theme, so no component uses a raw hex. Load Archivo (with the width axis for expanded headlines) and IBM Plex Mono through `next/font`. Restyle the existing shadcn button, input, label and card: 44 px controls, 4 px radius on controls and 8 px on cards, signal red primary, 2 px asphalt focus border plus ring.
5. **Auth and pages.** `/sign-in`, `/create-account`, `/dashboard`, and a minimal `/` placeholder with the wordmark and links to sign in and create an account. Forms post to server actions validated with Zod schemas from `src/lib`, show field errors tied to the inputs, and redirect to the dashboard. `src/proxy.ts` does the cookie check for `/dashboard`. The dashboard reads the real session in a child component behind Suspense, shows the empty state copy from the UI guide, and has a sign-out button. Catch-all route at `src/app/api/auth/[...all]/route.ts`.
6. **next-intl.** English only. All strings in `messages/en.json`. `html lang` from `getLocale()`. Type augmentation in `global.ts`. No switcher. French is added later by switching the request config to a cookie read.
7. **Health.** `GET /api/health` runs `SELECT 1` through Prisma and returns 200 `{ status: "ok", database: "ok" }` or 503 with the failing part named.
8. **Sentry.** `src/instrumentation-client.ts`, `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`, `src/instrumentation.ts` with `register` and `onRequestError`, `src/app/global-error.tsx`, and the wrapper in `next.config.ts`. Each init is skipped when its DSN is unset. The worker gets `src/worker/instrument.ts` and flushes before exit. No tunnel route and no source map upload until the org and project exist.
9. **Docker.** `Dockerfile.web`: multi-stage on `node:24-alpine`, prisma generate then `next build` with standalone output, runs `node server.js` as a non-root user on port 3000. `Dockerfile.worker`: full install, runs `tsx src/worker/index.ts`. The worker image carries the Prisma CLI so `npm run db:deploy` can become the Coolify pre-deploy command later. No Coolify settings are touched.
10. **.env.example** with every variable the code reads and a one-line comment each: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `PORT`. AWS and MixRoute variables are added in the milestones that use them.
11. **CI.** `.github/workflows/ci.yml` on every pull request: Node from `.nvmrc`, `npm ci`, `prisma generate`, `prisma validate`, lint, typecheck, `prisma migrate deploy` against a Postgres 18 service container, tests. Marking the four checks as required is a GitHub branch protection setting for the repo owner to turn on.
12. **Tests written with the code.** Unit tests for the Zod auth schemas and for the health route with a mocked database. Vitest runs them in CI.
13. **Verification.** Lint, typecheck, tests, prisma validate, `next build`, both Docker builds. Then with Postgres up: migrate, start the dev server and the worker, create an account, sign in, load the dashboard, call the health route, and confirm the worker heartbeat logs. Raw outputs go in the report.

## Assumptions

- Route names are `/sign-in`, `/create-account` and `/dashboard`.
- The two auth forms use server actions with Zod rather than React Hook Form. React Hook Form arrives with the questionnaire in M3.
- Body typeface is Archivo at normal width, as the UI guide proposes.
- CI includes a Postgres service so later milestones can run database tests.
- Work is committed in logical steps on the feature branch. Nothing is pushed and no pull request is opened until asked.
- Migrations run once per deploy from the worker image through a Coolify pre-deploy command, to be set when Coolify is configured.

## Out of scope for M0

Questionnaire, opportunities list, listing detail, instant score, CanadaBuys adapter, SES, S3, MixRoute, Stripe, French copy, Coolify configuration, Cloudflare rules.
