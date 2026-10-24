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

Playwright is installed as a dev dependency but has no config yet. Vitest config is `vitest.config.mts` with the `@/` alias and two projects: unit tests (`*.test.ts`, next to the code, run in parallel) and integration tests (`*.int.test.ts`, run afterwards one file at a time because they share the fixture rows). Integration tests hit the real database through `DATABASE_URL` and skip themselves when it is unset.

## Architecture

`docs/BEAVERBIDS_ARCHITECTURE.md` is the source of truth for stack decisions, folder layout, hosting, and branching. Read it before adding a dependency or a top-level folder. Better Auth, Zod, next-intl, Sentry and pg-boss are wired (M0). Zustand and React Hook Form arrive with the questionnaire in M3.

**Fixtures.** `fixtures/tenders.json` is fictional data attached to a `fixtures` source row that is never active, so it cannot be mistaken for CanadaBuys notices. Dates are day offsets resolved at seed time. The seed and the M2 golden set read it through `fixtureTenderInputs(now)` in `src/lib/seed/fixtures.ts`.

**API.** Route handlers only parse, authenticate and serialize; the query logic lives in `src/lib` (for example `src/lib/opportunities.ts`). Errors use `apiError()` from `src/lib/api.ts` so every route returns `{ error: { code, message } }`. `GET /api/opportunities` paginates with a keyset cursor on closing date and id and returns the stored score when one exists (a placeholder with a null total otherwise). `sort=score` still orders by closing date; the score keyset is an M3 follow-up.

**Scoring (M2).** `src/lib/scoring` is pure TypeScript: `scoreTender(tender, profile, now)` runs `requirements.ts` (a deterministic text extractor: certifications, bond, clearance, Canadian data residency, set-aside, after-hours, references, bilingual, category keyword hits) and one function per factor under `factors/` (category 40, location 20, size 15, timeline 15, credentials 10), then the gate (`gate.ts`: province mismatch or set-aside only), the category cap (`CATEGORY_CAP` in `score.ts`: under 10 category points caps the total at 49, factors stored uncapped, `result.cap` set) and the band. Each factor returns `points`, `max` and `facts`; `reasons.ts` turns the facts into `{ code, params, text }` reasons in three lists (inFavour, gaps, ruleOut) plus a two or three line summary, from fixed English templates with labels in `labels.ts`. No AI in the MVP. `run.ts` (`scoreAll`) upserts the `score` table with `modelVersion` from `score.ts` (currently rules-2); bump it when a rule changes. The worker registers `score-all` and `score-profile` (`src/worker/jobs/scoring`, queue names in `src/lib/queues.ts`, stately policy with singleton keys, nightly 06:15 Toronto placeholder until M4 chains it after the import). `fixtures/golden.json` holds 23 tender and profile pairs with expected bands and `expectedCapped`; `golden.test.ts` must keep passing, and a pair that changes band needs a note in the PR. The sample pair (FIXTURE-0001 and `SAMPLE_PROFILE` in `src/lib/seed/sample-profile.ts`) must score 92 with 38, 19, 14, 12 and 9. `fixtures/canadabuys-sample-20.csv` is the trimmed real-file sample (contact columns blanked on purpose); `src/lib/scoring/canadabuys-sample.ts` is a test-only reader for it until the M4 adapter exists.

**One Next.js app, two processes.** The website, login app, and REST API (route handlers under `src/app/api/`) ship together as `beaverbids-web`. Long-running work (CanadaBuys CSV ingest, AI scoring via MixRoute, SES email) runs in a separate `beaverbids-worker` process started by `src/worker/index.ts`, with jobs queued in PostgreSQL via pg-boss. Never do scraping, scoring, or email sends inside a page or route handler; enqueue a job instead. Code shared by web and worker (db client, zod schemas, s3, ses, auth) lives in `src/lib/`.

**Database.** Prisma 7 with PostgreSQL. The CLI config is `prisma7.config.ts` (non-default name, but Prisma auto-loads it) and it reads `DATABASE_URL` from `.env` via dotenv. The generated client is written to `src/generated/prisma/` (gitignored), so run `npx prisma generate` after cloning or changing the schema. Import the client from there, not from `@prisma/client`. The schema holds the Better Auth models plus the M1 product tables: CompanyProfile (one per user, the five questionnaire steps), Source, IngestRun, Tender (unique on source plus external id) and Score (unique on tender plus profile). Option codes stored in string columns are validated against `src/lib/schemas/vocab.ts`. Money is whole CAD dollars. Later phases add draftProfile, savedTender, digest and event.

**UI.** shadcn/ui with the `base-nova` style, which is built on `@base-ui/react`, not Radix. Components are in `src/components/ui/` and are ours to edit. `cn` is re-exported from the `cn` npm package via `@/lib/utils`. Tailwind v4 is wired through the `@tailwindcss/turbopack` loader in `next.config.ts` and theme tokens live in `src/app/globals.css`; there is no `tailwind.config`. Icons come from `lucide-react`. Path alias `@/`* maps to `src/`*.

**Deploy.** Coolify on a Hetzner box builds `Dockerfile.web` (standalone Next.js, non-root) and `Dockerfile.worker` (tsx plus the Prisma CLI, so `npm run db:deploy` runs from it as the pre-deploy command) and runs Postgres alongside. Sentry (`@sentry/nextjs`) covers both web and worker; the worker should also report to Sentry Crons after the daily ingest. `/api/health` is the uptime endpoint and must check the database.

## Git workflow

Branch flow is `feature/*`, `bugfix/*`, `chore/*` → PR into `development` → PR into `staging` → PR into `main`. `hotfix/*` branches from `main` and is merged back into `development`. Open PRs against `development`, not `main`, unless it is a hotfix. Coolify auto-deploys `staging` and `main`.

Note: the scaffold created `.env.example`  with a trailing space in the filename.

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
