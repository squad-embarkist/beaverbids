# Running BeaverBids locally

Oct 30, 2026

Day-to-day loop for this stack: one Next.js app (pages and the REST API), a separate worker process, and PostgreSQL. Product rules live in [development-guide.md](development-guide.md). Stack, folders and hosting live in [BEAVERBIDS_ARCHITECTURE.md](BEAVERBIDS_ARCHITECTURE.md).

## What you are running

| Piece | Tool | Local command | What it does |
| --- | --- | --- | --- |
| Database | PostgreSQL 18 | `docker compose up -d` | Users, sessions, tenders, scores, and the job queue |
| Web and API | Next.js 16 (Turbopack) | `npm run dev` | Pages, auth, and `/api/*` at http://localhost:3000 |
| Worker | Node and pg-boss | `npm run worker` | Scoring and CanadaBuys ingest. Never runs inside a page request |
| Schema | Prisma 7 | `npm run db:migrate` | Tables. The client is generated into `src/generated/prisma` |
| Auth | Better Auth | (inside the web app) | Email and password only. Sessions live in Postgres |

Shared code lives in `src/lib`. The worker must never import from `src/app`. Node 24 is required (`engines` in `package.json`).

Environment variables are listed in `.env.example`. Copy that file to `.env` if you do not have one. Local development needs `DATABASE_URL`, `BETTER_AUTH_SECRET` (at least 32 characters) and `BETTER_AUTH_URL=http://localhost:3000`.

## First time on a machine

```bash
docker compose up -d
npm install
npx prisma generate
npm run db:migrate
npm run db:seed
```

`npx prisma generate` is needed after a clone, and again after a schema change. `npm run db:migrate` applies migrations and regenerates the client.

The seed loads 55 fictional tenders from `fixtures/tenders.json` and, outside production, a development account with the sample company profile:

- email: `dev@beaverbids.test`
- password: `beaverbids-dev`

After the worker scores that profile, the sample IT managed services tender (FIXTURE-0001) should land at 92.

## Fresh data

The seed does not write score rows. Scores appear after `npm run worker` runs (it scores every profile at startup outside production).

**Re-seed without wiping.** Safe to run any time. It upserts the 55 fixture tenders and the development account; extra users, questionnaire answers and CanadaBuys notices stay.

```bash
npm run db:seed
npm run worker
```

**Wipe the database and start over.** Drops every table (users, tenders, scores, pg-boss jobs), reapplies migrations, then seed again. Use this when the local database is messy, an ingest left real notices you do not want, or you want the sample account back to its original profile.

```bash
npx prisma migrate reset
npm run db:seed
npm run worker
```

`migrate reset` asks for confirmation. Prisma 7 may not run the seed by itself, so run `npm run db:seed` afterwards. The seed is an upsert, so a second run is harmless.

If Postgres itself is the problem (volume corruption, wrong role), throw the Docker volume away and migrate from scratch:

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
npm run worker
```

**Real CanadaBuys notices on top of fixtures.** The fixtures source stays for development and tests. Ingest adds a second source (`canadabuys`). Both show in the list because both are active outside production. Hide the samples with the steps in [Real data only](#real-data-only).

```bash
npm run ingest -- canadabuys
```

A successful import enqueues a full rescore. The worker must be running, or start it afterwards.

## Real data only

The list and the scorer read **active sources only**. Fixtures and CanadaBuys are two `Source` rows. Turning samples off is a flag on the fixtures row, not a delete.

**On a laptop, hide the 55 fictional tenders** after a real import. In Prisma Studio open `Source`, find `code = fixtures`, set `active` to false. Refresh `/opportunities`. The fixture rows stay in `Tender` but disappear from the list and from scoring. Do not run `npm run db:seed` afterwards: the seed sets that flag from `NODE_ENV`, so on a laptop it turns fixtures back on.

Or skip the seed and import only:

```bash
docker compose up -d
npm run db:migrate
npm run ingest -- canadabuys
npm run worker
```

There is no `dev@beaverbids.test` in that case. Create an account and complete the questionnaire, then let the worker score.

Leave fixtures **on** when you run tests or Playwright. Those suites expect the sample tenders and the development account.

**Staging and production do not need a daily manual ingest.** The worker env sets `INGEST_SCHEDULE=on`. CanadaBuys is scheduled at 14:00 UTC (after the portal refreshes its open-notices file). A successful run stores the CSV, upserts notices, withdraws ones that left the file, then enqueues `score-all`. You watch Sentry Crons (`ingest-canadabuys`) and the `IngestRun` rows, you do not run `npm run ingest` every morning.

| Environment | Samples | Import | First fill |
| --- | --- | --- | --- |
| Laptop | Active after seed. Flip `Source.active` to hide them | By hand: `npm run ingest -- canadabuys`. Leave `INGEST_SCHEDULE` unset | Seed, or ingest once |
| Staging | Seed is skipped when `NODE_ENV=production`. If a fixtures row exists it is inactive, so it never shows | Worker cron at 14:00 UTC. Raw files on disk (`RAW_FILES_DIR` on a persistent volume) until S3 exists | Wait for 14:00 UTC, or set `INGEST_ON_STARTUP=canadabuys` once, or run one ingest from the worker host |
| Production | Same: fixtures inactive or absent. Seed never creates the development account | Same cron. Worker refuses to start without `S3_BUCKET` | Same as staging. Do not leave `INGEST_ON_STARTUP` on as a standing value |

A new staging or production database is empty until the first successful import. After that the schedule keeps it current. A failed run leaves yesterday's tenders and scores in place.

## Prisma Studio

A third terminal. Postgres must already be up. There is no npm script; Prisma reads `DATABASE_URL` from `.env` through `prisma7.config.ts`.

```bash
npx prisma studio
```

Opens http://localhost:5555. Next.js stays on 3000; if 5555 is taken, pick another port:

```bash
npx prisma studio --port 5556
```

Use it to inspect seeded tenders, the development user, company profiles, scores and ingest runs. Tables Studio shows are the Prisma models: `User`, `Session`, `Account`, `Verification`, `CompanyProfile`, `Source`, `IngestRun`, `Tender`, `Score`. pg-boss jobs live in the `pgboss` schema and are not modelled, so they do not appear.

Studio writes straight to the database. Edits skip Zod, scoring and the worker. Prefer it for looking, not for creating product data. Laptop only; do not expose the port.

## Every work day

Leave Postgres running. Start the web app and the worker in two terminals from the repo root.

**1. Database**

```bash
docker compose up -d
```

`compose.yaml` starts Postgres 18 with user, password and database all `beaverbids`, on `localhost:5432`. Data lives in a Docker volume, so it survives app restarts.

**2. Web app**

```bash
npm run dev
```

Open http://localhost:3000. Sign in with the seeded account and go to `/opportunities`.

**3. Worker** (second terminal)

```bash
npm run worker
```

Wait for the `worker started` log line. Without this process:

- questionnaire saves still return 200, but `rescoreQueued` is false
- the opportunities list stays empty or stale
- ingest never runs

Outside production the worker scores every open tender for every profile at startup. Leave `INGEST_SCHEDULE` unset on a laptop so a leftover schedule never imports on its own. Raw CanadaBuys files go to `.data/raw` (gitignored). Production uses S3 instead and refuses to start without `S3_BUCKET`.

## Typical loop after that

1. Branch from `development` as `feature/...`, `bugfix/...` or `chore/...`.
2. Edit code. `npm run dev` reloads the UI.
3. If you change `prisma/schema.prisma`, run `npm run db:migrate`. Never edit a migration that has already been applied; add a new one.
4. If you change a scoring rule, bump `modelVersion` in `src/lib/scoring/score.ts` and keep `fixtures/golden.json` passing. A pair that changes band needs a note in the pull request.
5. Before calling the work done:

```bash
npm run lint
npm run typecheck
npm test
```

A single file:

```bash
npx vitest run path/to/file.test.ts
```

`npm run e2e` starts Playwright. It starts `next dev` (or reuses yours) and a worker, and refuses any `DATABASE_URL` that is not localhost because the suite creates and deletes accounts.

6. Open a pull request into `development`, not `main`. Coolify auto-deploys `staging` and `main`.

## Commands

```bash
npm run dev            # Next.js on http://localhost:3000
npm run worker         # pg-boss worker
npm run build          # production build (standalone output for Docker)
npm run start          # serve the production build
npm run lint           # eslint .
npm run typecheck      # next typegen && tsc --noEmit
npm test               # vitest run
npm run e2e            # playwright; DATABASE_URL must be localhost
npm run ingest -- canadabuys
npm run ingest:check -- path/to/file.csv
npm run db:generate    # regenerate the Prisma client
npm run db:migrate     # create and apply a migration (laptop)
npm run db:deploy      # apply existing migrations (CI and Coolify)
npm run db:validate    # prisma validate
npm run db:seed        # upsert fixtures plus the development account
npx prisma migrate reset  # drop the database, remigrate; then db:seed
npx prisma studio      # database GUI at http://localhost:5555
docker compose up -d   # local Postgres 18
docker compose down -v # stop Postgres and delete its volume (full wipe)
```

## When you need real tenders, not fixtures

Leave the daily schedule off. Run one import by hand:

```bash
npm run ingest -- canadabuys
```

That downloads the CanadaBuys open notices file, stores the CSV, upserts notices, then enqueues a full rescore. Check category-cap behaviour against the sample profile with:

```bash
npm run ingest:check -- path/to/file.csv
```

The trimmed real-file sample is `fixtures/canadabuys-sample-20.csv`.

## What you can ignore locally

- **S3, SES and MixRoute.** Not needed for the current MVP loop. Raw files land on disk.
- **Sentry.** A blank DSN means nothing is sent.
- **`INGEST_SCHEDULE=on`.** Staging and production only.
- **`INGEST_ON_STARTUP`.** Optional. A comma-separated list of source codes (for example `canadabuys`) to import once when the worker starts. Leave blank unless you want that.
- **`npm run build` / `npm run start`.** Production shape, not daily coding.
- **`npm run db:deploy`.** CI and Coolify. On a laptop use `npm run db:migrate`.

## If something looks empty

| Symptom | Likely cause |
| --- | --- |
| App will not start, or Prisma cannot connect | Postgres is down. Run `docker compose up -d` |
| Sign-in works, list is empty or scores are missing | Worker is not running. Run `npm run worker` |
| Questionnaire saved, scores did not update | Worker was down when you saved. Start it and it will rescore at startup |
| `dev@beaverbids.test` unknown | Run `npm run db:seed` |
| Fixture dates look old, or the sample profile drifted | `npm run db:seed` then restart the worker |
| Want an empty database with only fixtures | `npx prisma migrate reset`, then `npm run db:seed` and `npm run worker` |
| Need to look at rows without writing SQL | `npx prisma studio` (http://localhost:5555) |
| Generated Prisma client missing | Run `npx prisma generate` |

## Stack in one place

| Layer | Tool | Role on a laptop |
| --- | --- | --- |
| Framework | Next.js 16.4, React 19, TypeScript | Landing page, signed-in app and API in one process |
| UI | shadcn/ui (base-nova / Base UI), Tailwind CSS 4 | Components in `src/components/ui`; tokens in `src/app/globals.css` |
| Forms and state | React Hook Form, Zod, Zustand | Same Zod schema for the form and the route handler |
| Auth | Better Auth | Email and password. No Google, Microsoft or magic link |
| Database | PostgreSQL 18, Prisma 7 | `compose.yaml` locally; Coolify Postgres in staging and production |
| Jobs | pg-boss | Queue tables in the `pgboss` schema. The worker process owns them |
| Ingestion | csv-parse, CanadaBuys adapter | Only the CanadaBuys open data file. Other portals need a terms review in `docs/permissions` first |
| i18n | next-intl | English and French. All user-facing text goes through messages |
| Monitoring | Sentry | Optional locally |
| Hosting | Coolify on Hetzner | Not used on a laptop. `Dockerfile.web` and `Dockerfile.worker` are for deploy |
