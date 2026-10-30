# [CLAUDE.md](http://CLAUDE.md)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read the bundled Next.js docs first

This project runs Next.js 16.4 with `cacheComponents` and `partialPrefetching` enabled. APIs and conventions differ from older Next.js. Before writing app code, read the relevant page under `node_modules/next/dist/docs/01-app/` (see `AGENTS.md`). Most relevant: `01-getting-started/08-caching.md` (`use cache`, Suspense boundaries), `15-route-handlers.md`, `16-proxy.md` (replaces middleware), and `02-guides/authentication-with-cache-components.md`.

## Commands

```bash
npm run dev          # next dev (Turbopack) on http://localhost:3000
npm run build        # production build (standalone output for Docker)
npm run start        # serve the production build
npm run lint         # eslint . (next lint no longer exists in Next 16)
npm run typecheck    # next typegen && tsc --noEmit (typegen creates the LayoutProps/PageProps globals; also checks message keys via global.ts)
npm test             # vitest run
npx vitest run path/to/file.test.ts   # single test file
npm run e2e          # playwright test: starts next dev (or reuses yours) and a worker; refuses any DATABASE_URL that is not localhost
npm run worker       # tsx src/worker/index.ts (pg-boss worker, loads .env itself; outside production it scores every tender for every profile at startup)

docker compose up -d           # compose.yaml: local Postgres 18 (user/pass/db all "beaverbids")
npm run db:migrate             # prisma migrate dev (creates a migration and applies it)
npm run db:deploy              # prisma migrate deploy (CI and Coolify pre-deploy command)
npm run db:generate            # regenerate the client into src/generated/prisma
npm run db:validate            # prisma validate
npm run db:seed                # 55 fictional tenders from fixtures/tenders.json plus, outside production, dev@beaverbids.test / beaverbids-dev with the sample profile
npx auth@latest generate --config src/lib/auth.ts -y   # refresh Better Auth models in schema.prisma
npx shadcn add <component>     # add a shadcn/ui component into src/components/ui
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test and prisma-validate as four named checks on every pull request, with a Postgres 18 service for the tests.

Vitest config is `vitest.config.mts` with the `@/` alias and two projects: unit tests (`*.test.ts`, next to the code, run in parallel) and integration tests (`*.int.test.ts`, run afterwards one file at a time because they share the fixture rows). Integration tests hit the real database through `DATABASE_URL` and skip themselves when it is unset. Playwright (`playwright.config.ts`, specs in `e2e/*.spec.ts`, desktop and 375 px phone projects) runs the M3 acceptance flow (`onboarding.spec.ts`: sign up, five steps, the sample tender at 92, the listing with its five meters) and the UI guide's accessibility checklist (`accessibility.spec.ts`: axe WCAG 2.2 AA on the four screens with colour contrast checked separately against the guide's two documented exceptions, one visible H1 and main, keyboard paths, 375 px and 200 percent zoom without horizontal scroll). `e2e/db.ts` refuses to run unless `DATABASE_URL` points at localhost, because the suite creates and deletes accounts through the `pg` driver (the generated Prisma client is ESM-only and Playwright loads files as CommonJS). The config starts `next dev` (reusing a running one outside CI) and a worker, waiting for its "worker started" log line. The dev account from `npm run db:seed` must exist. CI runs it as a fifth `e2e` job that is not a required check yet.

## Architecture

`docs/BEAVERBIDS_ARCHITECTURE.md` is the source of truth for stack decisions, folder layout, hosting, and branching. Read it before adding a dependency or a top-level folder. Better Auth, Zod, next-intl, Sentry and pg-boss are wired (M0). Zustand and React Hook Form arrive with the questionnaire in M3.

**Fixtures.** `fixtures/tenders.json` is fictional data attached to a `fixtures` source row. Scoring and the list read active sources only, so the seed creates that row active outside production (development, tests and the e2e suite run on it) and inactive in production, where it must never show beside real notices (`fixtureSourceActive()` in `src/lib/seed/fixtures.ts`). Dates are day offsets resolved at seed time. The seed and the M2 golden set read it through `fixtureTenderInputs(now)`.

**API.** Route handlers only parse, authenticate and serialize; the query logic lives in `src/lib` (for example `src/lib/opportunities.ts`, `src/lib/profile.ts`). Errors use `apiError()` from `src/lib/api.ts` so every route returns `{ error: { code, message } }`. `GET /api/opportunities` returns `regions` (an array of province codes, or `["CA"]`), `noticeType`, `noticeKind`, `withdrawnAt`, `officialUrl` (the link in the source file, often null) and `noticePageUrl` (the notice's page on the source portal) on every item, and the stored score when one exists (a placeholder with a null total otherwise; `factors` and `reasons` are parsed through `src/lib/scoring/stored.ts` and come back null when unreadable). `sort=closing` pages with a keyset on closing date and id. `sort=score` (the default) with a profile runs in two phases: the profile's score rows ordered by total desc, closing date, tender id, then the tenders with no score row for that profile by closing date, so every open tender appears once and scored rows come first; a `band` filter skips phase 2. The cursor is a base64url discriminated union on `phase` (closing, scored, unscored), and `closingWithin` (days) is the list's "closing within" filter. `GET /api/profile` returns the signed-in user's profile (404 before the questionnaire starts). `PUT /api/profile` saves one questionnaire step: body `{ step, answers }` parsed by `profileStepSaveSchema` (a discriminated union on the five step schemas, so the form resolver and the route share one check); the basics step creates the row, any other step without a row is 409; `questionnaireStep` only grows; then `requestRescore` enqueues `score-profile` with the id from the saved row through the web app's send-only pg-boss instance (`src/lib/boss.ts`: supervise, schedule and migrate off, so the worker must have run once). A failed send is logged and reported, and the save still returns 200 with `rescoreQueued: false`. Job payloads are Zod schemas in `src/lib/queues.ts` parsed by both the enqueue helpers and the worker handlers, so a `score-profile` job without a profile id fails instead of rescoring everyone.

**Signed-in screens (M3).** Under the `src/app/(app)/` route group: its layout holds the top bar (`src/components/app-header.tsx`, two nav items, red active rule) and the questionnaire store provider. `/questionnaire/[step]` serves the five steps (`QUESTIONNAIRE_STEPS` in `src/lib/schemas/company-profile.ts`; unknown step is 404; a later step without a profile redirects to basics) for both onboarding and "My answers". `/opportunities` is the scored list: a plain GET filter form plus band chips that keep state in the URL (`src/components/opportunities/query-url.ts`), and a "Show more" control that appends the next page in place: the client component calls the `loadMoreOpportunities` server action, which re-checks the session and returns the next rows rendered by the same list component, then focus moves to the first new row; without JavaScript it is a link to the next page, rows as a table from 768 px and cards below, the "Scoring you against" panel, and the server calling `listOpportunities` directly; a user with an unfinished questionnaire is redirected to the next step. `/dashboard` redirects there permanently. Score chips (`src/components/score/score-chip.tsx`) keep the number and band word in asphalt and use the band colour on the border and bar only. Reasons render through `createReasonText` (`src/components/score/reason-text.ts`): the `Reasons.<code>` next-intl messages with params labelled through `Vocab`, the stored English text only as the fallback; `reason-text.test.ts` asserts every `REASON_CODES` entry has a message and renders clean. Navigation links styled as buttons use `ButtonLink` (keeps the link role), not Base UI's Button with a Link render. `/opportunities/[id]` is the listing detail (`getOpportunity` in `src/lib/opportunities.ts`, also behind `GET /api/opportunities/[id]`): breadcrumb, closing box with the days left, the notice link (`src/components/opportunities/notice-link.tsx`: the official link in a new tab, or, when `officialUrl` is null, a link to the source's `baseUrl` plus the reference number with a copy button), the score panel (`src/components/score/score-panel.tsx`: 56 px total, band word, five `role="meter"` bars in the fixed order, the category cap note, "Not eligible" with the rule-out reasons for a gated tender, "on its way" before the first score) and the three-list fit assessment. `fixtures/tenders.json` keeps FIXTURE-0054 without a link so the fallback shows with seed data. Create account lands on basics; sign in lands on the list or the first unfinished step. `src/proxy.ts` only checks for the cookie on `/questionnaire`, `/opportunities` and `/dashboard`; every page still verifies the session behind Suspense. Questionnaire components live in `src/components/questionnaire/`: `form-schemas.ts` holds one form schema per step (native-input values, normalized and piped through the shared step schema, so the resolver and the route apply the same rules), the forms use React Hook Form with native inputs inside `OptionCard` labels (no Controller), `use-save-step.ts` does the PUT and the navigation, and `store.ts` (Zustand, created per layout mount) keeps the last saved row so a step page never shows an older copy than the user just saved. Inputs carry `defaultValue`/`defaultChecked` beside `register` so the server HTML already shows the saved answers. Money formats use `currencyDisplay: "narrowSymbol"` ("$250K", not "CA$250K").

**Scoring (M2).** `src/lib/scoring` is pure TypeScript: `scoreTender(tender, profile, now)` runs `requirements.ts` (a deterministic text extractor: certifications, bond, clearance, Canadian data residency, set-aside, after-hours, references, bilingual, category keyword hits) and one function per factor under `factors/` (category 40, location 20, size 15, timeline 15, credentials 10), then the gate (`gate.ts`: province mismatch or set-aside only), the category cap (`CATEGORY_CAP` in `score.ts`: under 10 code plus keyword points, buyer points excluded, caps the total at 49, factors stored uncapped, `result.cap` set) and the band. Each factor returns `points`, `max` and `facts`; `reasons.ts` turns the facts into `{ code, params, text }` reasons in three lists (inFavour, gaps, ruleOut) plus a summary of two or three of the same reason objects (one only when the whole result has a single reason). `params` carry codes (category, buyer type, region, team size band, certification codes), never English labels; `labels.ts` labels them for the English fallback text only, and the UI labels a code in the viewer's language. The stored `text` is an English fallback only: screens render a reason from the next-intl message keyed by its `code` with its `params` (`renderReason` in `reasons.ts`), and every emitted code is listed in `REASON_CODES`, so a wording or translation change never needs a rescore. No AI in the MVP. `run.ts` (`scoreAll`) upserts the `score` table with `modelVersion` from `score.ts` (currently rules-4: tender regions are an array and match on any overlap with the profile's, and category codes are deduplicated on both sides before the share is taken; rules-3 added the held clearance); bump it when a rule changes. `scoreAll` reads only open tenders (`openTenderFilters` in `src/lib/tenders.ts`: not closed, not withdrawn, a bid or untyped notice, from an active source), extracts requirements once per tender and writes one profile at a time in tender id order. The worker registers `score-all` and `score-profile` (`src/worker/jobs/scoring`; queue names, job shapes and the `enqueueScoreAll` and `enqueueScoreProfile` helpers in `src/lib/queues.ts` so a route handler never imports the worker; stately policy with singleton keys; `score-all` has no cron of its own since M4, the import enqueues it with reason `ingest`). `fixtures/golden.json` holds 25 tender and profile pairs with expected bands and `expectedCapped`; `golden.test.ts` must keep passing, and a pair that changes band needs a note in the PR. The sample pair (FIXTURE-0001 and `SAMPLE_PROFILE` in `src/lib/seed/sample-profile.ts`) must score 92 with 38, 19, 14, 12 and 9. `fixtures/canadabuys-sample-20.csv` is the trimmed real-file sample (contact columns blanked on purpose); the CanadaBuys adapter's parser and golden batch read it.

**Ingestion (M4).** `src/worker/jobs/ingest`: `runIngest(adapter, deps)` in `run.ts` is the pipeline for one source (source row created from the adapter and its `active` flag never written again; `ingestRun` row; Sentry Crons check-in on monitor `ingest-<code>`; download; the raw file stored before parsing through `src/lib/storage.ts`, S3 when `S3_BUCKET` is set, else `RAW_FILES_DIR`, and a production worker refuses to start without S3 unless `SENTRY_ENVIRONMENT=staging`; parse; the failure rules; batched upsert on source plus external id; `withdrawnAt` set on notices that left the file and cleared when they return; the run summary JSON; `score-all` enqueued). It fails, before any write, on a bad download, a parser error, zero rows, every row skipped, or a row count under 70 percent of the last successful run; single bad rows are skipped and counted, more than 10 percent skipped is a Sentry warning, and a file older than 36 hours is a warning. Adapters live under `sources/` behind `SourceAdapter` (`types.ts`: one source row, a schedule, `fetch`, `parse` into `TenderInput` with a stable external id) and are listed in `registry.ts`; CanadaBuys is the only one and starts active, and any other portal needs its terms review in `docs/permissions` first. The CanadaBuys adapter (`sources/canadabuys`) reads the dictionary column labels, cleans HTML, parses closing times at UTC-5, maps regions (provinces, NCR to ON and QC, cities, Canada-wide and foreign values to CA), buyers, UNSPSC and GSIN prefixes to the ten categories, notice types to `NoticeKind`, and builds `noticePageUrl` from the reference number (`notice-url.ts`). The `ingest` queue is stately with the source code as singleton key, keyed schedules with `missed: "once"`, and `createQueue` is always followed by `updateQueue`. The schedule registers only when `INGEST_SCHEDULE=on` (staging and production; off removes any schedule left behind). `npm run ingest -- canadabuys` runs one import inline; `npm run ingest:check -- <file.csv>` prints the category cap acceptance report for the sample profile. Nothing in `src/app` imports the adapter.

**One Next.js app, two processes.** The website, login app, and REST API (route handlers under `src/app/api/`) ship together as `beaverbids-web`. Long-running work (CanadaBuys CSV ingest, AI scoring via MixRoute, SES email) runs in a separate `beaverbids-worker` process started by `src/worker/index.ts`, with jobs queued in PostgreSQL via pg-boss. Never do scraping, scoring, or email sends inside a page or route handler; enqueue a job instead. Code shared by web and worker (db client, zod schemas, s3, ses, auth) lives in `src/lib/`.

**Database.** Prisma 7 with PostgreSQL. The CLI config is `prisma7.config.ts` (non-default name, but Prisma auto-loads it) and it reads `DATABASE_URL` from `.env` via dotenv. The generated client is written to `src/generated/prisma/` (gitignored), so run `npx prisma generate` after cloning or changing the schema. Import the client from there, not from `@prisma/client`. The schema holds the Better Auth models plus the M1 product tables: CompanyProfile (one per user, the five questionnaire steps; M3 added `securityClearance`, validated against `CLEARANCE_LEVELS`, and `indigenousBusiness`), Source, IngestRun, Tender (unique on source plus external id; `officialUrl` is nullable since M3 because more than half of CanadaBuys notices carry no link) and Score (unique on tender plus profile). Option codes stored in string columns are validated against `src/lib/schemas/vocab.ts`. Money is whole CAD dollars. Later phases add draftProfile, savedTender, digest and event.

**UI.** shadcn/ui with the `base-nova` style, which is built on `@base-ui/react`, not Radix. Components are in `src/components/ui/` and are ours to edit. `cn` is re-exported from the `cn` npm package via `@/lib/utils`. Tailwind v4 is wired through the `@tailwindcss/turbopack` loader in `next.config.ts` and theme tokens live in `src/app/globals.css`; there is no `tailwind.config`. Icons come from `lucide-react`. Path alias `@/`* maps to `src/`*. The landing page (`src/app/page.tsx`, components under `src/components/landing/`) is built from the Figma file "Beaver bids website" frame 1:957; its three photos are placeholders in `public/landing/` (hero.jpg 527 × 817, demo.jpg 620 × 611, footer.jpg 80 × 96) that a real photo of the same name and size replaces with no code change. The demo form opens a plain email link to `NEXT_PUBLIC_DEMO_REQUEST_EMAIL`.

**Deploy.** Coolify on a Hetzner box builds `Dockerfile.web` (standalone Next.js, non-root) and `Dockerfile.worker` (tsx plus the Prisma CLI, so `npm run db:deploy` runs from it as the pre-deploy command) and runs Postgres alongside. Sentry (`@sentry/nextjs`) covers both web and worker, and the worker checks in to Sentry Crons around every import (monitor `ingest-canadabuys`, created by the first check-in). The worker's environment carries `INGEST_SCHEDULE=on`, and either `S3_BUCKET` with the AWS variables or, on staging until the bucket exists, `RAW_FILES_DIR` on a persistent Coolify volume so the raw files survive a redeploy. `/api/health` is the uptime endpoint and must check the database.

## Git workflow

Branch flow is `feature/*`, `bugfix/*`, `chore/*` → PR into `development` → PR into `staging` → PR into `main`. `hotfix/*` branches from `main` and is merged back into `development`. Open PRs against `development`, not `main`, unless it is a hotfix. Coolify auto-deploys `staging` and `main`.

Note: the env example file is `.env.example` (the scaffold's trailing-space filename is gone).

# BeaverBids

Canadian tender matching web app. Users answer a 5 step questionnaire and see tenders scored out of 100. Phase 1 launches on the CanadaBuys open data file only.

## Stack (do not swap anything without asking)

- Next.js App Router, React, TypeScript (strict), Tailwind CSS, shadcn/ui
- API: Next.js route handlers in src/app/api
- Forms: React Hook Form with Zod. State: Zustand
- Auth: Better Auth, sessions stored in our own Postgres
- Database: PostgreSQL with Prisma. Schema in prisma/schema.prisma
- Jobs: pg-boss in a separate worker (src/worker). No Redis
- Files: AWS S3. Email: Amazon SES
- AI: MixRoute, only through the one wrapper module in src/lib
- Monitoring: Sentry. Hosting: Coolify on Hetzner (Dockerfile.web, Dockerfile.worker)
- i18n: next-intl, English and French

## Layout

- src/app: pages and src/app/api route handlers
- src/components: shadcn/ui and our own UI
- src/worker: index.ts and jobs/ingest, jobs/scoring, jobs/email
- src/lib: code shared by web and worker (db, zod schemas, s3, ses, auth, scoring, ai)
- prisma/, fixtures/ (seed tenders and the golden scoring set), docs/

## Commands

- npm run dev, npm run lint, npm run typecheck, npm test
- npm run worker, npm run db:migrate, npm run db:seed
- docker compose up -d starts local Postgres

## Rules

- Validate every input with a Zod schema from src/lib. The same schema serves the form and the route handler
- The worker never imports from src/app
- Scores come from rules in src/lib/scoring. AI only writes the explanation and never changes a number
- Weights: category 40, location and eligibility 20, contract size 15, timeline and capacity 15, credentials 10. Bands: 75 to 100 High, 50 to 74 Medium, under 50 Low
- Jobs must be safe to rerun. The daily import uses a singleton key
- Only the CanadaBuys open data file is imported. Any other source needs written permission saved in docs/permissions first
- Never commit secrets. Keep .env.example current
- No Claude attribution in commit messages or pull request descriptions: no `Co-Authored-By: Claude` and no `Claude-Session:` lines. `.claude/settings.json` turns the attribution off, `.githooks/commit-msg` strips the lines (active after `npm install`, which points `core.hooksPath` at `.githooks`), and the `commit-messages` CI job fails a pull request that still carries them
- Never edit a migration that has been applied. Add a new one
- All user facing text goes through next-intl, in English and French
- Write tests with the code. Scoring changes must keep the golden set in fixtures/ passing
- Before using any library, read its current official documentation. Do not rely on memory
- Canadian spelling. No em dashes in any text

## Workflow

- Branch from development as feature/..., bugfix/... or chore/... and open a pull request into development
- Never push to development, staging or main directly
- Plan first for anything bigger than one file. Keep changes small and run lint, typecheck and tests before saying done

## Decisions (Oct 23, 2026)

- docs/development-guide.md is the source of truth. Where docs/project-brief.md disagrees with it, follow the guide
- Auth is email and password only through Better Auth. No Google, Microsoft or magic link. The MVP sends no email, so no SES templates
- The AI proposal writer, editor, export and pipeline board are not in phase 1
- Three long-lived branches stay: development, staging, main. GitHub Actions runs lint, typecheck, tests and prisma validate on every pull request and all four must pass before merge
- CanadaBuys ingestion sits behind a source adapter interface so other portals can be added later. Build no other adapter now
- Still open, to be confirmed with the senior developer: cacheComponents in next.config, whether staging shares the server, Coolify, domains, AWS, Sentry and DSNs



For any plan, write it to docs/plans/<milestone>-[plan.md](http://plan.md) first, then wait for my approval.

@docs/development-guide.md
@docs/ui-ux-guide.md
