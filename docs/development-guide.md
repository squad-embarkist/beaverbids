# BeaverBids Development Guide

Oct 16, 2026 · @CJD

## Purpose

This guide tells Jhomar what to build for BeaverBids phase 1, in what order, and how each piece should behave. It follows the senior developer's architecture (BEAVERBIDS\_ARCHITECTURE.pdf): one Next.js and TypeScript app, a separate worker, PostgreSQL, deployed with Coolify on the existing Hetzner server. Phase 1 is the core loop: a user answers five questions, sees opportunities scored out of 100, opens a listing, and gets a Monday email digest.

The architecture PDF decides tools, hosting, folders and branches. This guide decides what to build and how it behaves. The product rules live in the project brief and the screens live in the lo-fi wireframes ("Core screens" page). If any of these disagree, raise it before building; do not pick one silently.

- **In phase 1:** onboarding questionnaire, opportunities list, listing detail with score breakdown, instant score on the landing page, EN/FR, weekly digest, and tenders from CanadaBuys.
- **Not in phase 1:** MERX, Bids&Tenders and any other portal (each waits for written permission), AI proposal writer, editor, DOCX export and pipeline board. The later phase is covered at the end so the phase 1 data model does not block it.
- **Already decided:** the stack, hosting and branch flow, taken from the architecture PDF.
- **Not decided yet:** anything listed under open questions at the end of this guide.

## MVP scope

The MVP is one loop: sign in, take the questionnaire, get daily CanadaBuys tenders, and see them scored against the profile. Where any later section of this guide asks for more, this section wins. This guide also wins over the project brief wherever they disagree. The AI proposal writer is not in the MVP or phase 1. Visual rules live in the UI/UX and Brand Guide.

| In the MVP | Later phase, do not build now |
| --- | --- |
| Sign in and create account | Instant score on the landing page (pasted tender link, PDF or website) |
| 5 step questionnaire saved as the company profile | Monday email digest, unsubscribe and consent tracking |
| Daily import of CanadaBuys first, then BC Bid, Alberta, Saskatchewan, New Brunswick and Nova Scotia, one source at a time, each after its terms check | Saved and hidden tabs, bookmarks |
| Tender list scored out of 100, sorted by score | AI written reasons, proposal writer, editor, pipeline board |
| Listing detail with the five factor breakdown | French copy, Stripe |

| Milestone | What changes for the MVP |
| --- | --- |
| M0 Foundations | English only through next-intl, no language switcher. Email and password only: no Google or Microsoft sign-in, no email sending |
| M1 Data model | Build only companyProfile, source, ingestRun, tender and score. Skip draftProfile, savedTender, digest and event |
| M2 Scoring engine | Rules only. Reasons come from fixed templates in code. No AI wrapper and no MixRoute key yet |
| M3 Core screens | Four screens: sign in, questionnaire, opportunities list, listing detail. No instant score, no saved or hidden tabs |
| M4 CanadaBuys ingestion | Unchanged |
| M5 Launch | Renamed Launch checks: privacy page, accessibility pass, import failure alert, one backup restore test. No digest, SES or consent work |

The API keeps auth, health, the opportunities list, the listing detail and the company profile. The instant score, save and hide, digest and unsubscribe endpoints wait for the later phase. Three open questions below (instant score, digest consent, French copy review) are parked until then.

## Phase 1 build order

Build in this order: each milestone unblocks the next, and the first three can be demoed with fixture data before the CanadaBuys import works. No dates or estimates here; the team sizes each milestone.

### M0. Foundations

- [ ] Repo `squad-embarkist/beaverbids` with the folder layout from the architecture section; Next.js, TypeScript, Tailwind and shadcn/ui installed
- [ ] `Dockerfile.web`, `Dockerfile.worker` and `compose.yaml` for local Postgres
- [ ] Coolify project with production and staging resources, each deploying from its branch
- [ ] GitHub Actions on every pull request: lint, type check, tests, `prisma validate` (not in the PDF; recommended)
- [ ] Better Auth wired to Prisma; Sentry in the web app and the worker; `/api/health` checks the database, with Sentry Uptime watching it
- [ ] `next-intl` set up for EN/FR before any screen is built
- [ ] Request Amazon SES production access in us-east-1 now; AWS can take up to 96 hours to reply

* **Done when:** a merge to `staging` deploys, and a signed-in user sees an empty dashboard in both languages.

### M1. Data model and fixtures

- [ ] Prisma schema and first migration for the tables in the data model section
- [ ] Seed script from `fixtures/` with about 50 realistic tenders, including the sample IT Managed Services tender (score 92)
- [ ] Shared Zod schemas in `src/lib` used by both forms and route handlers

* **Done when:** the seed loads on a clean database and `GET /api/opportunities` returns it.

### M2. Scoring engine

- [ ] Rules in `src/lib/scoring`: eligibility gate, category, location, size, timeline, credentials; pure functions with unit tests
- [ ] Golden test set in `fixtures/`: 20 tender and profile pairs with expected bands
- [ ] Reasons job: one wrapper module calls MixRoute to write the short "why this matches" lines, only for Medium and High listings

* **Done when:** the sample tender scores 92 for the sample profile and the golden set passes.

### M3. Core screens on fixture data

- [ ] Onboarding questionnaire (5 steps): React Hook Form with Zod, Zustand holding the answers, saved as a draft profile
- [ ] Opportunities list with filters, sort by score and band chips
- [ ] Listing detail with the five factor bars and the link out to the official portal
- [ ] Instant score on the landing page, before signup

* **Done when:** a tester completes onboarding and opens a scored listing without help.

### M4. CanadaBuys ingestion

- [ ] Worker with `pg-boss`: a daily job downloads the CanadaBuys CSV and stores the raw file in S3
- [ ] Parse with `csv-parse`, normalize, and upsert tenders on source plus external id
- [ ] After each import, enqueue scoring for every profile
- [ ] Sentry Crons check-in when the job finishes; alert on failure or zero rows

* **Done when:** the import runs every morning unattended for a week and fresh tenders score correctly.

### M5. Launch checks (MVP)

- [ ] Signup that keeps the draft profile and instant score
- [ ] Monday digest job sending through SES, with an unsubscribe link and a recorded consent date (Canada's anti-spam law)
- [ ] Stripe billing if the pricing decision is made (open question)
- [ ] Accessibility pass, French copy review, privacy page that states where data is stored
- [ ] One real backup restore test before launch

* **Done when:** a new user goes from landing page to a received digest with no manual step.

## Stack and repo layout

One Next.js app serves the pages and the REST API, and a separate worker process runs the slow jobs. Both are TypeScript, share the code in `src/lib`, and deploy as two containers on Coolify. Scoring runs in the worker, never inside a web request.

| Layer | Tool | Role |
| --- | --- | --- |
| Framework | Next.js 16.4, React 19, TypeScript 6.0 | Landing page, web app and API in one project |
| UI | shadcn/ui 4.22, Tailwind CSS 4.3 | Components we copy in and own; utility styling |
| Forms and state | React Hook Form 7.90, Zod 4.6, Zustand 5.0 | Zod rules shared by form and API; Zustand keeps questionnaire answers across steps |
| Auth | Better Auth 1.7.11 | Email and password or Google; sessions stored in our own database |
| API | Next.js route handlers | One small file per endpoint under `src/app/api` |
| Database | PostgreSQL 18 with Prisma 7.10.1 | Tables described once in `schema.prisma` |
| Files | AWS S3, us-east-1 | Uploads, the raw daily CanadaBuys file, database backups |
| Jobs | pg-boss 12.38 | Job queue inside Postgres; retries and schedules; runs in the worker |
| Ingestion | csv-parse 7.0 now; Cheerio 1.2 and Lightpanda 1.0 later | The last two only after written permission from MERX and Bids&Tenders |
| AI | MixRoute | One gateway for many models; one key per module with a spending cap |
| Email | Amazon SES | Password and confirmation emails, and the digest |
| Monitoring | Sentry 11.8, Sentry Uptime, Sentry Crons | Errors, outside health check, and a morning "did the import run" check |
| Hosting | Hetzner CCX13 (Ashburn), Ubuntu 24.04, Coolify 4.4.6, Docker 29.9, Cloudflare | Existing server; Coolify builds and runs every container |
| Runtime | Node.js 24 | Web app and worker |

Versions are copied from the architecture PDF. Confirm each against its official release page before pinning.

```text
beaverbids/
  src/
    app/              landing page, login app, api/ (route handlers)
    components/       shadcn/ui and our own UI
    worker/
      index.ts        starts the pg-boss worker
      jobs/
        ingest/       canadabuys.ts (merx.ts later)
        scoring/      rules runner and MixRoute reasons
        email/        SES sends, digest
    lib/              shared by web and worker: db, zod, s3, ses, auth, scoring
    generated/prisma/ made by prisma generate (not in git)
  prisma/             schema.prisma, migrations/
  fixtures/           seed tenders and the golden test set
  public/
  Dockerfile.web      deploys to Coolify: beaverbids-web
  Dockerfile.worker   deploys to Coolify: beaverbids-worker
  compose.yaml        laptop only: Postgres 18
  .env.example
```

| Concern | Rule |
| --- | --- |
| Shared code | Anything used by both the web app and the worker lives in `src/lib`; the worker never imports from `src/app` |
| Validation | One Zod schema per input, used by the form and by the route handler |
| Config | Environment variables only; keep `.env.example` current |
| Jobs | Idempotent, with a singleton key on the daily import so it cannot run twice at once |
| Migrations | Run `prisma migrate deploy` once per deploy, before the web app and worker start, not from both containers |
| AI calls | One wrapper module in `src/lib` that calls MixRoute; log prompt version, tokens and cost on every call |
| Server limits | Set memory limits per container, since web, worker and database share the 8 GB server (and staging, if it runs there) |
| Network | Let only Cloudflare's IP ranges reach ports 80 and 443 on the server |
| Environments | Coolify project BeaverBids with `production` (deploys `main`) and `staging` (deploys `staging`), each with its own web, worker and database |
| Branches | `feature/*`, `bugfix/*`, `chore/*` by pull request into `development`, then `staging`, then `main`; `hotfix/*` from `main` by pull request, then merged back into `development` |

## Data model

Nine tables carry phase 1, beside the ones Better Auth and `pg-boss` create for themselves. Describe them once in `prisma/schema.prisma`; names and columns below are a starting point for the first migration, as long as the relations hold. Every table has `id`, `createdAt` and `updatedAt`.

| Table | Key columns | Notes |
| --- | --- | --- |
| `draftProfile` | sessionToken, answers (JSON), instantScoreCache | Pre-signup answers; merged into `companyProfile` on signup |
| `companyProfile` | userId, name, categories (array), regions (array), sizeMin, sizeMax, certifications (array), capacity, timelinePref, securityClearance, indigenousBusiness | The five questionnaire steps feed this. Clearance and the Indigenous-business flag were added in M3 (docs/plans/m2-category-cap.md) |
| `source` | code (canadabuys at launch), name, baseUrl, active, lastSuccessAt | One row per data source, created by its adapter on the first run; `active` is set by hand and decides whether its notices are scored and listed; more rows only with written permission |
| `ingestRun` | sourceId, startedAt, finishedAt, status, rowsFound, error, summary (JSON) | Drives the failure and zero-row alerts; the summary holds the counts, skipped rows by reason, unmapped values and the stored file's key and hash (M4) |
| `tender` | sourceId, externalId, title, buyer, buyerType, description, categoryCodes, regions (array), valueMin, valueMax, publishedAt, closesAt, language, officialUrl, noticePageUrl, noticeType, noticeKind, solicitationNumber, withdrawnAt, rawFileKey | Unique on sourceId plus externalId. `regions` holds province codes or `["CA"]` (M4, several provinces per notice are common). `noticeKind` (BID, RFI, ACAN, DIRECTED, OTHER, UNKNOWN) and `withdrawnAt` (set when a notice leaves the source file) keep non-bids and withdrawn notices out of scoring and the list |
| `score` | tenderId, profileId, total (0 to 100), band, eligible, factors (JSON), reasons (JSON), modelVersion, scoredAt | Unique on tenderId plus profileId |
| `savedTender` | userId, tenderId, status | Phase 1 save and hide; status grows into pipeline stages later |
| `digest` | userId, sentAt, tenderIds, status | Prevents duplicate sends |
| `event` | userId or sessionToken, name, props (JSON) | Funnel analytics: score viewed, signup, digest opened |

**Tables other tools create.** Better Auth generates its own user, session, account and verification tables; extend its user with language, `digestOptIn` and `digestConsentAt` rather than hand writing auth tables. `pg-boss` keeps its job tables in its own schema, so do not model them in Prisma.

`score.factors` stores the five points as numbers, for example `{"category": 38, "location": 19, "size": 14, "timeline": 12, "credentials": 9}`, so the listing detail bars render without recomputing.

Relations: a tender belongs to one source; a score joins one tender to one company profile; a user has one profile in phase 1. Index `tender.closesAt` and `score (profileId, total desc)`.

Later additions: a `tenderDocument` table for parsed tender files, and a vector column on `tender` only if similarity search is added (see the scoring section).

## Scoring engine spec

Every tender gets a score out of 100 for a given company profile, made of five factors that sum to 100. The point splits are fixed by the product; the sub-rules below are proposed defaults for the team to tune against the golden set.

| Factor | Max points | What it checks | Proposed rule |
| --- | --- | --- | --- |
| Category match | 40 | Does the work the buyer wants match what the company does | Category code and keyword match against the profile's categories, scaled to 0 to 40; similarity search can replace it later if matches are too crude |
| Location and eligibility | 20 | Can this company legally and practically bid | Region served, language, required registrations; full points when all met |
| Contract size | 15 | Is the value inside the company's range | Full points inside the range, falling off the further outside it; unknown value gets half |
| Timeline and capacity | 15 | Enough time to respond and deliver | Days until close against the profile's preferred lead time, plus stated capacity |
| Credentials | 10 | Certifications, security clearance, past work asked for | Share of required credentials the profile lists |

**Category cap (decided Oct 24, 2026, threshold set Oct 26).** A tender with fewer than 10 points from category codes and keywords, not buyer type, has its total capped at 49, so it is always a Low fit. Without the cap, a tender with no category match could still reach 58 from location, size, timing and credentials alone and show as Medium; a right buyer says nothing about the work, so buyer-type points do not count towards the threshold. The cap changes the number itself, so the score and the band always agree. The five factor values are stored as computed; only the total is capped, and the stored reasons carry a `categoryCap` entry so the screen can say why. The golden set includes pairs that prove the cap, and any change to this rule updates the golden set, the brief and this guide together. The review of the fixture tenders under 10 and the decisions are in docs/plans/m2-category-cap.md; modelVersion rules-2.

**Security clearance (rules-3, Oct 28, 2026).** The credentials step asks for the highest personnel security clearance held (Reliability, Secret, Top Secret or none). A clearance of any level satisfies a detected clearance requirement, because the text extractor only detects that one is required, not which level; the level is stored so a later rule can compare it. A held clearance earns the location check points and a `clearanceHeld` reason in your favour; without one the tender still shows `clearanceRequired` under "could rule you out". The golden set pins the difference with two program-evaluation pairs for the national consultancy.

**Regions and code dedupe (rules-4, Oct 29, 2026).** A tender's regions are a list. The location check passes when the tender or the profile covers all of Canada or the two lists share a province; otherwise the gate rules the tender out and names the tender's provinces. Category codes are deduplicated on both sides before the share is taken, so several UNSPSC codes mapping to one category count once. No golden pair moved.

**Bands:** 75 to 100 High, 50 to 74 Medium, under 50 Low. Chips and colours on the screens use these bands.

**Eligibility gate.** A hard requirement the company cannot meet (a required licence, a region restriction, a set-aside for another group) sets `eligible = false`. The listing still saves, but it shows as "Not eligible" with the reason and does not appear in the default list or the digest.

### Two passes and one option

1. **Rules.** Pure TypeScript functions in `src/lib/scoring`, run by the worker for every tender and profile pair. They produce the number and the five factor points.
2. **Reasons.** After the rules, a worker job calls MixRoute to write two or three plain-language lines on why a listing matches or what is missing. Only for Medium and High listings that passed the gate.
3. **Similarity (optional, later).** If keyword matching proves too crude for category match, add pgvector in Postgres. Prisma cannot model a vector column, so that part uses raw SQL. Decide after the golden set shows how many matches the rules miss.

The AI never changes the number. It explains it. That keeps scores repeatable and keeps cost proportional to good matches, not to every imported tender. The architecture PDF describes AI summarizing tender text for scoring; this guide keeps the score rule based, so confirm that with the senior developer (see open questions).

### Instant score

The wireframe landing page takes a pasted tender link or PDF and a company website, and returns a score with reasons before any account. That needs safe fetching of the link, PDF text extraction and an AI call before signup, none of which the architecture PDF covers, so how to build it is open question 2. A cheaper first version scores listings already in the database from the questionnaire inputs, using the rules only.

### Testing

- Unit tests for each factor, table driven, run in CI.
- A golden set of 20 tender and profile pairs in `fixtures/` with the expected band; a change that moves a golden pair across a band needs a note in the pull request.
- Store `modelVersion` on every score so a rule change can trigger a clean rescore.

## API endpoints

REST route handlers under `/api`, one small file per endpoint in `src/app/api`. Public routes work with a draft session token; the rest need a signed-in Better Auth session. Input is checked with the same Zod schemas the forms use. Errors use one shape: `{"error": {"code": "...", "message": "..."}}`. Better Auth owns `/api/auth/*`, so no custom route may live there.

| Method and path | Auth | Purpose | Returns |
| --- | --- | --- | --- |
| `POST /api/draft-profiles` | Public | Start or update the questionnaire draft (steps 1 to 5) | Draft with `sessionToken` |
| `POST /api/instant-score` | Public | Score a pasted tender and website, or a draft against saved tenders (see the instant score section) | Total, band and the five factors |
| `POST /api/profile/claim-draft` | User | Merge the draft into a company profile after signup | Company profile |
| `GET /api/me` | User | Current user, language and digest setting | User object |
| `GET /api/profile` | User | Read the company profile | Profile |
| `PUT /api/profile` | User | Save one questionnaire step, body `{ step, answers }` checked with that step's Zod schema; queues a rescore of that profile only (M3) | Profile plus `rescoreQueued` |
| `GET /api/opportunities` | User | Scored list. Query: `band`, `region`, `category`, `valueMin`, `valueMax`, `closesBefore`, `sort` (score or closing), `cursor`, `q` | Page of tenders with score summary |
| `GET /api/opportunities/{id}` | User | Listing detail | Tender, score total, factors, reasons, official URL |
| `POST /api/opportunities/{id}/save` | User | Save a listing | Saved state |
| `DELETE /api/opportunities/{id}/save` | User | Remove a saved listing | 204 |
| `POST /api/opportunities/{id}/hide` | User | Hide a listing from the list | 204 |
| `GET /api/saved` | User | Saved listings | Page of tenders |
| `PUT /api/settings/digest` | User | Turn the Monday digest on or off and record consent | Settings |
| `POST /api/events` | Public | Record a funnel event | 204 |
| `GET /api/health` | Public | Checks the app and the database; watched by Sentry Uptime | Status |
| `POST /api/internal/rescore` | Internal key | Queue a rescore job for a profile or a tender batch | Job id |

**Behaviours to build in from the start**

- **Pagination:** cursor based, 25 per page by default, 100 maximum.
- **Rate limits:** stricter on the public instant score route, since it is open to the web; Cloudflare rules can help.
- **Language:** the locale sets reason text and labels; tender text is never machine translated.
- **Eligibility:** `GET /api/opportunities` hides ineligible tenders by default; pass `includeIneligible=true` to see them.
- **Official link:** the listing detail always returns `officialUrl`; the app does not host tender documents.
- **Slow work:** route handlers only queue jobs; the worker does the importing, scoring and sending.

## Data ingestion

Phase 1 launches on one source: the CanadaBuys open tender file, which is published for free under an open licence, so launch needs no scraping and carries no legal risk. Every other source waits for written permission.

| Source | Status | Method | Notes |
| --- | --- | --- | --- |
| CanadaBuys | Built (M4, Oct 29, 2026) | Daily CSV download at 14:00 UTC, `csv-parse` | Open licence; the worker downloads the open tender notices file every morning. Plan and acceptance report in docs/plans/m4-plan.md |
| MERX | Later | Cheerio on the tender list | Its terms forbid copying data today; build only after written permission |
| Bids&Tenders | Later | Lightpanda, a light headless browser | Its terms ban scraping for business today; build only after written permission |
| BC Bid, SEAO, NBON, Alberta Purchasing Connection | Not planned | To be decided | Shown in the wireframes but not in the architecture PDF; check each one's terms and any data feed first |

**Pipeline**

1. A `pg-boss` schedule queues the CanadaBuys job each morning.
2. The worker downloads the CSV and saves the raw file to S3 before any parsing, so a parser bug can be replayed.
3. `csv-parse` reads it; normalize and upsert tenders on source plus external id.
4. Queue scoring for every company profile.
5. The job reports to Sentry Crons when it finishes.

**Rules**

- Keep written permission for any non-open source in the repo before its code is merged.
- A run that returns zero rows, or far fewer than the last run, is a failure and alerts the team through Sentry.
- Amendments and new closing dates update the existing tender, never create a second one.
- Keep a small sample CSV in `fixtures/` so the parser has tests that run offline.
- Jobs are safe to rerun: a retry must never duplicate a tender or a score.

**What the CanadaBuys file actually contains** (profile of the open tender notices file received Oct 24, 2026: 897 notices, 67 columns, plus a 5 row sample of the new notices file with the same columns). Use this as the parser and scoring reference.

| Finding | Detail | What it means for the build |
| --- | --- | --- |
| One row per notice | No duplicate reference numbers. The amendment number shows the latest version (516 of 897 were amended) | Upsert on source plus referenceNumber. A new version replaces the row |
| No contract value column | Only 11% of descriptions mention a dollar amount | The size factor is "unknown" for most tenders. Keep the partial points rule and show "value not stated" |
| Category codes are patchy | UNSPSC on 85%, GSIN on 5%, neither on 11% (96 rows). Values start with "\*" and can hold several codes on separate lines | Strip the asterisk and split on new lines. Tenders with no code must still be able to earn category points from title and description words, or the category cap will wrongly hide them |
| Regions are messy | Delivery region on 87%, opportunity region on 43%. Values include Canada, World, National Capital Region, provinces, cities (Ottawa, Montréal, Edmonton) and "(except NCR)". Entity province appears as Quebec, Québec, QC, Ontario, ON and ONTARIO | Needs one normalization table for provinces and regions before scoring |
| Not every notice is a bid | 98 are clearly not bids (68 requests for information, 21 advance contract award notices, 7 not applicable, 2 directed contracts) and 110 have no notice type | Store the notice type. Hide non-bid types from the scored list by default |
| Status cannot be trusted alone | All 897 say Open, yet 121 have closing dates before Oct 24, 2026 and 41 close in 2031 or later (some in 2100, likely standing arrangements) | Hide anything past its closing date. Treat far future dates as ongoing, not as a real deadline |
| Closing time has no time zone | Format is like 2026-11-13T14:00:00 | Confirm the zone in the data dictionary before showing dates to users |
| Links are incomplete | The notice link is filled for only 45% (407 rows), and every one points off CanadaBuys: Ariba (311) or MERX (96). Attachments are filled for 42% | The listing detail needs a fallback link. MERX documents may carry fees |
| Text needs cleaning | 109 descriptions (12%) contain HTML entities or tags. English and French are in separate columns. Descriptions contain line breaks | Use a real CSV parser, decode entities and strip tags before the keyword rules run |
| Buyers are concentrated | 76 buyers. Public Works (PSPC) has 391 notices and National Defence has 128, together 58% | Buyer-type points matter a lot, so check them against this mix |
| IT-related volume | 99 notices have UNSPSC codes starting with 43 or 81 | Useful as a first sanity check for the sample IT profile |

Sample files should go into fixtures/ as a small trimmed copy (about 20 rows), not the 5.9 MB original.

**Source adapters.** Build ingestion so more sources can be added later without touching scoring or the screens. Each source is one adapter with four parts: fetch the data, parse it into the shared tender shape, give every tender a stable external id, and own one row in the source table. CanadaBuys is built first, and the provincial adapters follow one at a time inside the MVP. The MVP target is six sources feeding one scored list.

| Source | Likely method | When | Gate before any code |
| --- | --- | --- | --- |
| CanadaBuys (federal) | Open data CSV | MVP | Open Government Licence - Canada |
| Alberta, Saskatchewan, New Brunswick, Nova Scotia, BC Bid | Look for an open data feed or API first; scrape only if the portal allows it | In the MVP, one source at a time after CanadaBuys | Terms review or written permission saved in docs/permissions |

Findings on Oct 24, 2026, from public pages and one third-party guide, not legal advice: only CanadaBuys offers an official open feed for current tenders. Nova Scotia publishes live notices on a web page with no feed, and its open data covers awarded tenders only. BC Bid, Alberta and Saskatchewan appear to need browser scraping. New Brunswick is unconfirmed. The terms of use of every portal except CanadaBuys are still unchecked, so each one needs a terms review or written permission before any code. A portal that is not cleared is skipped, never forced.

- Scoring and screens read only the tender table, never a source's own format.
- Each source runs as its own scheduled job and writes its own ingestRun, so one failing source never stops another.
- A source with zero rows fails loudly and raises its own Sentry alert.
- Add a duplicate check across sources, because the same tender can appear on CanadaBuys and a provincial portal.
- A new source ships with a small sample file in fixtures/ and a parser test, like CanadaBuys.

## Later phase: AI writer and pipeline

Nothing here ships in phase 1, but three phase 1 choices keep it cheap to add: tenders keep their raw file in S3, `savedTender.status` can grow into pipeline stages, and the AI wrapper already logs cost per call.

| Feature | What it does | Build notes |
| --- | --- | --- |
| Proposal editor | Rich text editor opened from a saved listing, with a section outline taken from the tender's requirements | New tables `proposal`, `proposalSection`, `proposalVersion`; autosave with version history |
| AI proposal writer | Drafts each section from the tender text and the company profile, with the user editing the result | Stronger model through MixRoute; every draft marked as AI generated and never auto submitted |
| Compliance check | Lists the tender's mandatory requirements and flags those the draft does not address | Extraction job over the tender text; checklist stored per proposal |
| Export | DOCX first, PDF second | Choose the Node libraries when the work starts; keep a template per source where formats differ |
| Pipeline board | Saved listings move through stages such as Interested, Writing, Submitted, Won, Lost | Extend `savedTender.status`; drag and drop board in the web app |
| Closing reminders | Email before a saved tender closes | Reuse the digest sender and a daily `pg-boss` job |

**Guardrails for the writer**

- The user owns and reviews every word; the product drafts, it does not submit.
- Uploaded company documents stay private to that account and are never used to train or improve models. Check MixRoute's data handling before any document goes through it.
- Show the source passage beside any claim drawn from the tender or the profile, so the user can check it.
- Track tokens and cost per proposal from day one to inform pricing.

**If TypeScript runs out of road.** Parsing and OCR of long tender PDFs, retrieval over a user's past proposals, or running an embedding model ourselves are the three things that would justify a small Python service behind the worker. Keep every AI call behind the one wrapper module so that move stays cheap.

## Open questions and risks

The architecture PDF settled the stack, hosting, auth provider and scraping rights (open data only at launch). These are still open, and each needs an answer before the milestone it blocks.

| # | Question | Blocks |
| --- | --- | --- |
| 1 | Portal coverage: the wireframes and landing page show six portals, but the plan launches on CanadaBuys only. Update the screens and the brief to match? | M3 copy |
| 2 | Instant score: build it as drawn (a pasted tender link or PDF plus a website, which needs link fetching, PDF parsing and an AI call before signup) or start with a simpler version that scores listings already in the database? | M3 |
| 3 | Is the AI writer in phase 1 or later? The brief lists it as a must-have, the core screens show it as later phase | Scope |
| 4 | Does AI only explain the score (this guide) or also summarize tender text for scoring (architecture PDF)? | M2 |
| 5 | Data location: Hetzner in Virginia and S3 in us-east-1, while the brief said a Canadian region. Accept it and say so on the privacy page, or move storage? | M5 |
| 6 | One 8 GB server runs web, worker and database, and nightly backups mean up to a day of lost data. Set memory limits and back up more often? | M0 |
| 7 | Keep three long lived branches (`development`, `staging`, `main`) or let `main` deploy to staging and promote to production by hand? | M0 |
| 8 | CI is not in the PDF. Add GitHub Actions with required checks before merge? | M0 |
| 9 | MixRoute: how does it store or reuse tender text and, later, company documents? | M2 |
| 10 | Pricing and plans: free tier, trial or paid only? Decides whether Stripe is in M5 | M5 |
| 11 | Who reviews the French copy and the French scoring reasons? | M5 |

**Risks**

- **One data source:** launch depends on the CanadaBuys file. Mitigation: raw file saved to S3, zero-row alerts, offline fixture tests, Sentry Crons.
- **Single server:** a spike in the worker can starve the web app. Mitigation: container memory limits, tested restores, a plan to move the database off the box if traffic grows.
- **Score trust:** a wrong or unexplained score loses users fast. Mitigation: golden set, visible factor breakdown, reasons grounded in the tender text.
- **AI cost:** reasons on every tender would be expensive. Mitigation: reasons only for Medium and High listings, one spending cap per MixRoute key.
- **Bilingual data:** tenders can be in French. Mitigation: keep the original language and put French cases in the golden set.
- **Email law:** the digest needs consent and an unsubscribe link under Canada's anti-spam law. Mitigation: record consent when the user opts in and honour unsubscribes immediately.
- **Learning curve:** the main developer is moving from Laravel and Nuxt to Next.js, Prisma and `pg-boss`. Mitigation: a small stack, pull request review by a second developer, and this guide kept current.
