# M4 CanadaBuys ingestion: build plan

Oct 29, 2026 · Status: built Oct 29, 2026 on `feature/m4-canadabuys-ingest` in six commits (the five planned plus the notice page link), each checked before the next started; the local acceptance run passed and is recorded under "Acceptance report" at the end. Remaining for "done": the pull request into `development` merged. The unattended week on staging is an M5 launch check.

Milestone M4 from docs/development-guide.md: a pg-boss schedule that runs each morning after CanadaBuys refreshes its open tender notices file, downloads the CSV, keeps the raw file (S3 in production, local disk in development), parses it with csv-parse against the column names in the CanadaBuys data dictionary, normalizes each notice into the shared tender shape, upserts on source plus external id, records an ingestRun row, queues scoring for every profile and checks in to Sentry Crons. A run with zero rows fails loudly. The pipeline sits behind a small source adapter interface in `src/worker/jobs/ingest/sources/` with CanadaBuys as the only implementation.

Done when the local acceptance run passes (the real file imported against the local database, the sample company profile seeing real federal tenders scored in the list, the parser tests on `fixtures/canadabuys-sample-20.csv` green, and the M4 acceptance check from docs/plans/m2-category-cap.md run and recorded at the end of this plan) and the pull request is merged into `development`. The unattended week on staging moves to the M5 launch checks.

Not built: any other portal (Saskatchewan, New Brunswick, Nova Scotia, BC Bid, Alberta each wait for a terms review saved in docs/permissions and a prompt of their own), the email digest, the instant score, AI reasons, the duplicate check across sources (one source only, nothing to compare), the attachments column.

## What the documentation says (checked Oct 29, 2026)

Sources: the supporting documentation page, the dataset page on open.canada.ca and the data dictionary XML (`achatscanada-canadabuys-dd.xml`, dd_version 1.0). Today's open file was downloaded and profiled to confirm the Oct 24 findings in the development guide.

| Fact | Detail | Effect on the build |
| --- | --- | --- |
| File | `https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv`, served from an Azure blob with `Last-Modified`, `ETag` and `Content-MD5` headers; 6.1 MB, UTF-8 with a byte order mark, 67 columns, one row per notice | `fetch` with a timeout, `bom: true` in csv-parse, the response headers kept on the run summary. The "new tender notices" file (every two hours) is not used: the open file is the whole open set and the upsert makes it idempotent |
| Refresh | The open, complete and fiscal-year files refresh once a day between 7:00 and 8:30 UTC-5. Today's `Last-Modified` was 10:20 UTC, inside the documented window | Schedule the job in UTC at 14:00 (09:00 EST, 10:00 EDT), 30 minutes after the window closes, with two retries 15 minutes apart. A fixed UTC-5 window means a Toronto-local cron would drift by an hour each summer |
| Licence | Open Government Licence - Canada | Nothing to save in docs/permissions; the source row's `baseUrl` points at the tender opportunities search page |
| Dictionary | Column labels are bilingual originals (`title-titre-eng`). `tenderClosingDate-appelOffresDateCloture` matches `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$` and is documented as UTC-5 (Eastern Standard Time, not daylight time). `publicationDate` and `amendmentDate` are `YYYY-MM-DD` or empty. `unspsc` is `*12345678` per line; `gsin-nibs` is `*D304A` per line; `procurementCategory` is `*CNST`, `*GD`, `*SRV` or `*SRVTGD` per line. `tenderStatus` is Open, Cancelled or Expired. `noticeType` is free text from a listed set. `referenceNumber` is the internal id of the notice; `solicitationNumber` is what links a notice to its award | Parse closing dates as `${value}-05:00`. One column map typed against the dictionary labels, so a renamed header fails the parser test instead of producing empty fields. External id is `referenceNumber` (unique in every file checked, 26 characters at most); `solicitationNumber` is stored for the later award link |
| Today's file | 894 notices. 81 closed before today while still marked Open, 54 close in 2030 or later. 98 are not bids (69 requests for information, 18 advance contract award notices, 9 not applicable, 2 directed contracts) and 110 carry no type (98 of them MERX notices, `MX-` prefix). 757 have UNSPSC codes, 39 GSIN, 98 neither; 291 carry more than one code, one carries 258. 421 have a notice link (323 Ariba, 98 MERX), 382 have an attachment. 110 descriptions contain HTML. 12 have an empty English description, 10 have no publication date. Regions: 107 have neither region column, 341 resolve to all of Canada, 273 to one province, 173 to several (103 of those only because the National Capital Region spans Ontario and Quebec). 102 descriptions mention a dollar amount | The numbers behind each decision below |

## Decisions to approve

These change the data model or the product behaviour, so they are listed first. Everything else in the plan follows from them.

1. **Region becomes an array.** `Tender.region String` becomes `Tender.regions String[]` (province codes, or `["CA"]` for all of Canada). 173 of today's 894 notices name more than one province; mapping them to CA would show an Ontario and Quebec notice to a British Columbia firm as all-of-Canada work, and mapping them to one province would gate the other province's firms. The M2 category cap plan recommended the array and asked for the decision before M4. `regionMatches` becomes an overlap check; the list filter becomes `hasSome`; the gate's `regionMismatch` reason carries the list. One migration converts the column in place (`ARRAY[region]`) so no data is lost.
2. **Notice type is stored and non-bids are hidden.** New `Tender.noticeType String?` (the raw value) and `Tender.noticeKind NoticeKind @default(BID)` (enum: `BID`, `RFI`, `ACAN`, `DIRECTED`, `OTHER`, `UNKNOWN`). `scoreAll` and `listOpportunities` read only `BID` and `UNKNOWN` rows. The 110 untyped notices stay visible because most are real MERX bids. A direct link to a hidden notice still opens the detail page with a "This is a {type}, not a call for bids" note. No gate change: hiding at the query level keeps the engine pure and avoids 98 pointless score rows per profile.
3. **Notices that leave the file are withdrawn, not deleted.** New `Tender.withdrawnAt DateTime?`. After a successful run, rows for that source that were not in the file get `withdrawnAt = now`; rows that reappear get it cleared. `scoreAll` and the list read only `withdrawnAt: null`. Without this a cancelled notice with a future closing date stays in the list forever. Fixtures keep null.
4. **English text, language EN.** `description` is the English column (tags stripped, entities decoded), `title` the English title, `language` is `EN`. The French columns are not stored in M4. A notice whose English and French descriptions are identical (17 today) is stored as is. Marking every notice `EN_FR` would cost every English-only profile two language points on every tender, as the M2 plan found.
5. **Buyer type defaults to federal.** Every contracting entity in the file is a federal body. A name table maps Defence and public safety bodies (DND, Defence Construction Canada, RCMP, Correctional Service, Public Safety, DRDC, Parliamentary Protective Service) to `defence-public-safety`, Crown corporations (Canada Post, BDC, EDC, VIA Rail, CMHC, Farm Credit, Bank of Canada, Marine Atlantic, Canada Lands, CDIC, Destination Canada, National Capital Commission) to `crown-utility`, the Government of the Northwest Territories to `provincial`, and everything else to `federal`. Never null: an unknown federal entity is still federal.
6. **Scoring chains after the import.** The 06:15 Toronto `score-all` placeholder schedule is removed (`unschedule` on worker start, once) and a successful run enqueues `score-all` with reason `ingest`. A failed run leaves yesterday's scores standing.
7. **Failure rules.** The run fails, with an `ingestRun` row in `FAILED`, a Sentry exception and an error check-in, when the download fails or is not HTTP 200, the body is empty, the parser throws, the file has zero data rows, or the row count is under 70 percent of the last successful run's count (the guide's "far fewer than the last run"). Validation failures on single rows never fail the run: the row is skipped, counted by reason, and the first five of each reason are logged. A `Last-Modified` older than 36 hours is a warning on the run summary, not a failure, because a day without a refresh is CanadaBuys' problem and our data is simply unchanged.
8. **Raw file storage falls back to disk outside production.** `S3_BUCKET` set means S3 through `@aws-sdk/client-s3` (already a dependency); unset means `RAW_FILES_DIR` (default `.data/raw`, gitignored). Staging runs on disk until the AWS bucket exists, with `RAW_FILES_DIR` on a persistent Coolify volume so the files survive a redeploy. In production the worker refuses to start without `S3_BUCKET`.
9. **The source row's `active` flag belongs to the operator, not the run.** The run creates the source row when missing and never changes `active` afterwards. CanadaBuys is created active; every later adapter is created inactive and switched on by hand after its terms review. Scoring and the list read tenders from active sources only. The fixtures source is created active outside production and inactive in production, so the fictional seed data keeps serving development, the tests and the e2e suite while never showing on the live site (this replaces the "never active" rule in CLAUDE.md, which was written when the flag had no reader).

## Folder layout

```text
src/worker/jobs/ingest/
  index.ts                 registerIngestJobs(boss, db, options): queue, schedule per source, handler
  run.ts                   runIngest(adapter, deps): the pipeline, pure of pg-boss
  errors.ts                IngestError with a code (zeroRows, rowCountDropped, download, parse)
  sources/
    types.ts               SourceAdapter, FetchResult, ParseResult, SkippedRow
    registry.ts            SOURCE_ADAPTERS: { canadabuys } and adapterFor(code)
    canadabuys/
      index.ts             the adapter: source row, schedule, fetch, parse
      columns.ts           COLUMNS: the dictionary labels this adapter reads, typed
      parse.ts             csv-parse stream, row to TenderInput, skipped rows
      text.ts              cleanHtml, splitStarred (moved from src/lib/scoring/canadabuys-sample.ts)
      regions.ts           region and province normalization table
      buyers.ts            contracting entity to buyer type
      categories.ts        UNSPSC and GSIN prefix map to the ten internal codes
      notice-kind.ts       noticeType text to NoticeKind
      *.test.ts            one test file beside each module
      golden.test.ts       the CanadaBuys golden batch on fixtures/canadabuys-sample-20.csv
src/worker/tools/
  ingest-once.ts           npm run ingest -- canadabuys: runs the pipeline inline, no pg-boss
  canadabuys-check.ts      npm run ingest:check -- <file.csv>: the M2 acceptance report
src/lib/
  storage.ts               RawFileStore: put(key, body, contentType) on S3 or disk
  queues.ts                + QUEUES.ingest, ingestJobSchema, enqueueIngest
  schemas/tender.ts        regions, noticeType, noticeKind, solicitationNumber
```

The worker never imports from `src/app`; nothing in `src/app` imports the adapter. Scoring and the screens read only the tender table, as the guide requires.

## The adapter interface

```ts
export type SourceAdapter = {
  // Owns one source row, created on the first run. `active` is the starting
  // value only; the run never changes it afterwards (decision 9).
  source: { code: string; name: string; baseUrl: string; active: boolean };
  // When the source refreshes. The ingest queue schedules one job per adapter
  // with this cron, keyed by source code.
  schedule: { cron: string; tz: string };
  // Download. Returns the bytes plus what the run summary records.
  fetch(ctx: { signal: AbortSignal; log: Logger }): Promise<FetchResult>;
  // Parse the bytes into validated TenderInput rows plus the rows it skipped
  // and the values it could not map. Pure: no database, no network.
  parse(body: Buffer, ctx: { now: Date; rawFileKey: string; existing: Map<string, { publishedAt: Date }> }): ParseResult;
};

export type FetchResult = { body: Buffer; contentType: string; fileName: string; lastModified: Date | null; etag: string | null };
export type ParseResult = {
  tenders: TenderInput[];           // externalId is the stable id, set by the adapter
  skipped: SkippedRow[];            // { row, externalId, reason, detail }
  unmapped: { categories: Record<string, number>; regions: Record<string, number>; buyers: Record<string, number> };
  rowsFound: number;                // data rows in the file, before skipping
};
```

Stable external id is the adapter's job (`TenderInput.externalId`); the runner never derives one. A later adapter adds one folder under `sources/` and one line in the registry. The runner, the queue, scoring and the screens do not change.

## The pipeline (`run.ts`)

One function, `runIngest(adapter, { db, store, boss, now, sentry })`, called by the pg-boss handler and by `npm run ingest`.

1. Create the source row by code when missing (`active` from the adapter's `source.active`, CanadaBuys true); update only `name` and `baseUrl` when it exists. Create the `ingestRun` row in `RUNNING`.
2. Sentry Crons `captureCheckIn` with status `in_progress` for monitor `ingest-<code>` and the monitor config (crontab from the adapter's schedule, timezone, `checkinMargin` 30, `maxRuntime` 45, `failureIssueThreshold` 1, `recoveryThreshold` 1). A no-op when `SENTRY_DSN` is unset.
3. `adapter.fetch()` with a 120-second `AbortSignal`. Fail on a non-200 status or an empty body.
4. `store.put(key, body)` before any parsing, key `<code>/<yyyy>/<mm>/<dd>/<fileName>-<HHmmss>Z.csv`, plus the SHA-256 of the body on the run summary. A parser bug can be replayed from the stored file.
5. Load the existing `externalId` and `publishedAt` for the source (one query, two columns). `adapter.parse(body, { now, rawFileKey, existing })`.
6. Zero data rows fails. A count under 70 percent of the last `SUCCEEDED` run's `rowsFound` fails. Both before any write, so a bad file never empties the table.
7. Upsert in batches of 100 inside a transaction: `createMany` for new ids, `update` for existing ones, rows ordered by external id. Then `updateMany` `withdrawnAt = now` for the source's rows not in the file and `withdrawnAt = null` for rows that came back. Counts inserted, updated, withdrawn, restored.
8. `ingestRun` to `SUCCEEDED` with `rowsFound`, `finishedAt` and the `summary` JSON (counts, skipped by reason, the top 20 unmapped values per table, file hash, `Last-Modified`, `ETag`, duration). `source.lastSuccessAt = now`.
9. `enqueueScoreAll(boss, "ingest")`. Check-in `ok`.
10. On any throw: `ingestRun` to `FAILED` with the error message, check-in `error`, `Sentry.captureException` with the source code and run id as tags, rethrow so pg-boss retries.

Safe to rerun: the upsert key is (sourceId, externalId), the run row is per attempt, and the store key carries the time so a retry never overwrites the first attempt's file.

### Queue and schedule

One queue `ingest` with policy `stately`, `expireInSeconds` 1800, `retryLimit` 2, `retryDelay` 900. Job data `{ source: "canadabuys" }` parsed by `ingestJobSchema` (a Zod enum of registered codes) on both sides, `singletonKey` = source code, so a retry never runs beside the original and two sources never block each other: a job that fails for one source is retried on its own key while another source's job runs. `boss.schedule(QUEUES.ingest, adapter.schedule.cron, { source }, { tz, key: source, singletonKey: source, missed: "once" })`, one schedule per registered adapter. `missed: "once"` sends one job after a deploy that straddled the morning slot.

`registerIngestJobs` also fixes the M2 follow-up on `createQueue`: it is a no-op once the queue exists, so the options are applied with `updateQueue` right after it, in the scoring registration too.

The handler runs inside the same `runJob` wrapper the scoring jobs use (log, Sentry, rethrow). No ingest runs at worker start; `INGEST_ON_STARTUP=canadabuys` opts in for development. Playwright is unaffected.

## The CanadaBuys adapter

**Columns** (`columns.ts`): the labels from the dictionary this adapter reads: both titles, reference number, solicitation number, amendment number and date, publication date, closing date, status, GSIN, UNSPSC, procurement category, notice type, both region columns, contracting entity name and province, notice URL, both descriptions. The parser test asserts every label is present in the sample file's header, so a header change breaks the test and not production silently.

**Parsing** (`parse.ts`): csv-parse streaming API with `columns: true`, `bom: true`, `relax_column_count: false`, `skip_empty_lines: true`, `on_record` building one object per row. Each row goes through `tenderInputSchema.safeParse`; failures are skipped with the Zod path as the reason.

**Per-field rules**

| Field | Rule |
| --- | --- |
| `externalId` | `referenceNumber`, trimmed. Empty is a skipped row (`missingReference`) |
| `solicitationNumber` | Stored as is; new nullable column |
| `title` | English title, whitespace collapsed, cut at 500 characters |
| `description` | English description through `cleanHtml` (block tags to line breaks, other tags removed, numeric and named entities decoded). Empty falls back to the French description, then to the title |
| `buyer` | Contracting entity name (English). `buyerType` from `buyers.ts` (decision 5) |
| `categoryCodes` | `unspsc` and `gsin-nibs` split on new lines, asterisk stripped, mapped through `categories.ts`, deduplicated. Unmapped codes counted on the run summary |
| `regions` | `regionsOfDelivery` split; if empty, `regionsOfOpportunity`; if empty, `["CA"]`. Each value through `regions.ts`; the result deduplicated; any `CA` collapses the list to `["CA"]` |
| `publishedAt` | `publicationDate`, else `amendmentDate`, else the existing row's `publishedAt`, else the run date |
| `closesAt` | `tenderClosingDate` + `-05:00` (fixed Eastern Standard Time per the dictionary). A row whose `closesAt` is not after `publishedAt` is skipped (`closesBeforePublished`); none in today's file |
| `language` | `EN` (decision 4) |
| `officialUrl` | `noticeURL-URLavis-eng` when it parses as a URL, else null (the detail page already falls back to the source's base URL plus the reference number) |
| `noticeType`, `noticeKind` | Raw value and the enum from `notice-kind.ts`: Request for Proposal, Request for Standing Offer, Request for Supply Arrangement, RFP against Supply Arrangement, Invitation to Qualify, Request for Quotation, Tender and Invitation to Tender are `BID`; Request for Information is `RFI`; Advance Contract Award Notice is `ACAN`; Directed Contract is `DIRECTED`; Not Applicable is `OTHER`; empty is `UNKNOWN`; anything else is `OTHER` and counted as unmapped |
| `rawFileKey` | The store key of this run's file |
| `valueMin`, `valueMax` | Null. The file has no value column; a dollar extractor from the description is a later scoring pass |
| Closed and far-future rows | Stored like any other. `closesAt > now` already hides closed notices everywhere; a 2065 closing date is treated as ongoing by the timeline factor (full time points) |

**Region table** (`regions.ts`): province and territory names in English and French, two-letter codes, upper and lower case variants seen in the file (`ONTARIO`, `Ont`, `Qc`, `Ontarion`, `Newfoundland`), `(except NCR)` stripped before lookup, `National Capital Region (NCR)` to `["ON", "QC"]`, cities to their province (every city in today's file is listed: Ottawa, Kingston, Petawawa, Toronto, Montréal, Gatineau, Edmonton, Calgary, Wainwright, Cold Lake, Winnipeg, Victoria, Comox, Halifax, Oromocto, Moncton, St. John's, Charlottetown, Iqaluit, Yellowknife and the rest, about 80 names), `Canada`, `World`, `Unspecified`, `Foreign`, `North America`, `Remote Offsite`, `Indigenous Lands` and `Aboriginal Lands` to `CA`. Any other value (foreign countries and continents today: United States of America, Asia, Europe, Mexico, Germany, Japan) maps to `CA` and is counted as unmapped: a notice delivered abroad is still open to Canadian suppliers, and an unknown region must never gate a notice for everyone.

**Category table** (`categories.ts`): longest-prefix match on UNSPSC digits and GSIN prefixes, a code mapping to at most one internal category, each entry with the dictionary description as a comment. First version from today's file:

| Internal code | UNSPSC prefixes | GSIN prefixes |
| --- | --- | --- |
| `it-managed-services-cloud` | 4319, 4320, 4321, 4322 (except 432225), 811100, 811119, 811120, 811121, 811123, 811600, 811617, 811618, 811619, 811622 | D302, D304, D399, N7010, N7025, N7035, JX7025 |
| `cybersecurity-data-protection` | 432225, 432332, 811118, 811122, 811615, 811623 | |
| `custom-software-saas` | 4323 (except 432332), 811015, 811115, 811116, 811117, 811620, 811621 | N7030 |
| `healthcare-it-ehr` | none yet; keywords only | |
| `commercial-construction` | 7211, 7212, 7213, 7215, 9512, 9513, 9514 | 5111 |
| `civil-engineering-infrastructure` | 7214, 8110 (except 811015), 8115 | C216 |
| `medical-equipment-pharma` | 42, 51 | |
| `facilities-janitorial` | 7210, 7610, 7611, 7612, 7613, 801616 | E108, N4235 |
| `logistics-freight-3pl` | 78 | V101, V401 |
| `management-consulting` | 8010, 8011, 8016 (except 801616), 8411 | T004 |

Uncertain entries that the acceptance check decides: 811623 "Risk management process as a service" (17 notices) under cybersecurity, GIS services (811015, 811117) under custom software, and 7210 building maintenance under facilities rather than construction. Environmental services (segment 77, 92 codes) and healthcare services (85) map to none of the ten categories on purpose.

**Skipped-row reasons**: `missingReference`, `missingTitle`, `closesBeforePublished`, `invalidClosingDate`, `schema:<path>`. Each with the first five examples logged at `warn`.

## Raw file store (`src/lib/storage.ts`)

```ts
export type RawFileStore = { put(key: string, body: Buffer, contentType: string): Promise<{ key: string; location: string }> };
export function createRawFileStore(env = process.env): RawFileStore;   // S3 when S3_BUCKET is set, else disk
```

S3: `PutObjectCommand` with `Bucket`, `Key` (optional `S3_PREFIX`), `Body`, `ContentType`, `ChecksumSHA256`; region and credentials from the SDK's default chain (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`). Disk: `RAW_FILES_DIR` (default `.data/raw`), key as a relative path, `mkdir -p`, write to a temp name then rename. `createRawFileStore` throws in production (`NODE_ENV=production` and `SENTRY_ENVIRONMENT` not `staging`) when `S3_BUCKET` is unset, and the worker's `main()` calls it before `boss.start()` so the process exits with a clear message. On staging the Coolify resource mounts a persistent volume at `RAW_FILES_DIR`, documented in the deploy section of CLAUDE.md. A unit test covers the disk store and a mocked S3 client. `rawFileKey` on the tender is the key without the bucket, so a move to S3 later needs no data change.

## Schema and migration

One migration, `m4_ingest_regions_notice_kind`:

- `Tender.region String` to `Tender.regions String[] @default([])`, data converted with `USING ARRAY[region]`, then the old column dropped. Index `regions` with GIN for the `hasSome` filter.
- `Tender.noticeType String?`, `Tender.noticeKind NoticeKind @default(BID)` with the enum above, `Tender.solicitationNumber String?`, `Tender.withdrawnAt DateTime?`. Index `[sourceId, withdrawnAt]`.
- `IngestRun.summary Json?`.

Fixtures: `fixtures/tenders.json` entries change `"region": "ON"` to `"regions": ["ON"]` by script; nothing else moves. `fixtures/golden.json` references tenders by id and needs no change.

## Scoring and query changes

- `ScoringTender.regions`, `regionMatches(tenderRegions, profileRegions)` true when either side has `CA` or the lists overlap. Gate blocker `regionMismatch` carries `regions: string[]`; the reason message becomes "Outside the provinces you work in: {regions}" with the codes labelled in the viewer's language through `Vocab`.
- `factors/category.ts` deduplicates both code lists with a `Set` (the M2 follow-up; duplicates arise from the prefix map, for example two UNSPSC software codes on one notice).
- `MODEL_VERSION` becomes `rules-4` (region overlap and the dedupe). No golden pair is expected to move: every fixture has one region and no duplicate code. A pair that moves gets a note in the pull request as the rule requires.
- `scoreAll`: filters `withdrawnAt: null`, `noticeKind in (BID, UNKNOWN)` and `source.active`; extracts requirements once per tender instead of once per pair; scores and flushes per profile with rows ordered by tender id then profile id (the two M4 follow-ups from the M2 review: memory and lock order).
- `listOpportunities` and `getOpportunity`: the same three filters on the list; `tenderFilters` region becomes `regions: { hasSome: [region, "CA"] }`; `OpportunityItem.regions`, `noticeKind`, `withdrawnAt`. The detail page still opens a hidden notice and shows the note from decision 2 or "Withdrawn from {source} on {date}".
- The score-all placeholder schedule is unscheduled on start; `SCORE_ALL_CRON` and its test go.

## Screens and API

Small, mechanical: the list rows and the detail page show the regions joined with the list formatter ("Ontario, Quebec"); the detail page gains a "Notice type" fact and the two notes above; `GET /api/opportunities` returns `regions` instead of `region` (M3 is on `development` and not deployed, so no versioning). New message keys in `messages/en.json` only: `Listing.notes.notBid`, `Listing.notes.withdrawn`, `Vocab.noticeKinds.*`, the reworded `Reasons.regionMismatch`. Canadian spelling, no em dashes.

## Configuration and deploy

`.env.example ` gains, with comments:

```text
# ---- Ingestion (worker) ----
CANADABUYS_OPEN_TENDERS_URL=""     # override for staging or tests; blank uses the official URL
INGEST_ON_STARTUP=""               # "canadabuys" runs one import when the worker starts (development only)
# ---- Raw files (worker). S3 when S3_BUCKET is set, else RAW_FILES_DIR. ----
S3_BUCKET=""
S3_PREFIX=""
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
RAW_FILES_DIR=".data/raw"
```

`.gitignore` adds `/.data`. `package.json` adds `ingest` and `ingest:check`. `Dockerfile.worker` needs no change: Node 24's `fetch` does the download and the S3 client is already installed. Coolify: the worker gets the variables above; the Sentry monitor `ingest-canadabuys` is created by the first check-in (upsert config), so nothing is clicked in Sentry. The S3 bucket, its IAM user with `s3:PutObject` on the prefix, and the AWS region are the open items from the guide's question 5 and are listed under questions below.

## Tests

| Where | What |
| --- | --- |
| `sources/canadabuys/parse.test.ts` | The 20-row sample: 20 rows, 67 columns, every label in `columns.ts` present, the blanked contact columns still blank; the per-row expectations the M2 plan listed: rows 12 and 13 `RFI` and `ACAN`, row 13 `publishedAt` from the run date, rows 14, 15 and 20 past closing, rows 7, 11 and 16 far future, row 20's 14 regions to 13 province codes, row 19 Wainwright to `AB`, row 10 `Ontario (except NCR)` to `ON`, row 1 NCR to `ON` and `QC`, row 5 World plus British Columbia to `BC`, row 8's two UNSPSC codes, rows 1, 2, 7, 11, 12 and 17 earning the IT categories, closing dates parsed at UTC-5, `cleanHtml` on rows 3, 6 and 18, links kept where present and null otherwise |
| `regions.test.ts`, `buyers.test.ts`, `categories.test.ts`, `notice-kind.test.ts` | Table driven on the values in today's file, including the misspellings; unknown values fall to the documented default and are reported |
| `golden.test.ts` | The CanadaBuys golden batch: the sample rows through the adapter then `scoreTender` against the sample profile, with expected eligibility, band and cap per row (replaces `src/lib/scoring/canadabuys-sample.test.ts`; its reader is deleted and `cleanHtml` and `splitStarred` move to `text.ts`) |
| `run.test.ts` | The pipeline with a fake adapter, store, db and boss: happy path writes the run row, stores before parsing, upserts, withdraws, enqueues score-all and checks in `ok`; zero rows fails before any write; a count at 69 percent of the last run fails and 70 percent passes; a download error marks the run `FAILED` and checks in `error`; skipped rows are counted and never fail the run; the source row's `active` flag is created from the adapter and never updated |
| `index.test.ts` | Queue created with the stately policy, one schedule per adapter with its key and `missed: "once"`, payload parsed before the adapter runs, the old score-all schedule removed |
| `storage.test.ts` | Disk store writes under `RAW_FILES_DIR`; S3 store sends the expected command (mocked client) |
| `run.int.test.ts` (ingest) | Against the local database: runs the pipeline twice on the sample file; the second run inserts nothing, updates 20, withdraws nothing; a third run on a 19-row copy withdraws one and a fourth restores it. Uses its own source code `canadabuys-test` so it never touches real rows |
| Existing suites | Scoring, opportunities, seed and e2e updated for `regions`; golden set still passing with rules-4 |

## Acceptance on real data (before "done")

With `npm run ingest -- canadabuys` against the local database and the dev account:

1. The run summary shows about 890 rows, the skipped reasons, and the unmapped lists; every unmapped region is a country or continent, every unmapped buyer is a federal body, and the unmapped codes are reviewed for additions to the table.
2. The sample profile's list shows real notices, sorted by score, with the non-bid and closed ones absent and a direct link to a hidden notice showing its note.
3. `npm run ingest:check -- <file>` runs the M4 acceptance check from docs/plans/m2-category-cap.md: scores every notice for the sample profile, lists the 43 and 81 notices held at Low by the cap with their text, samples the other capped notices, and prints a pass or fail against the rule written there. The result and any table changes are appended to this plan. A failure reopens the cap rule for coded tenders as that plan says; it does not block the import itself.
4. On staging: the worker runs for a week, the Sentry monitor shows seven green check-ins, and `ingest_run` holds seven `SUCCEEDED` rows with plausible counts.

## Build order

One branch, `feature/m4-canadabuys-ingest`, one pull request into `development`, five commits. Each commit passes lint, typecheck and tests, and work stops after each one for a check before the next starts.

1. **Schema and shared shape.** Migration, `tenderInputSchema`, fixtures JSON, the fixtures source active outside production, the mechanical `regions` plumbing through the scoring types (one region in an array behaves exactly as before, no version bump), the hidden-row filters (`withdrawnAt`, `noticeKind`, active source) in `scoreAll` and the list, list and detail display, messages.
2. **Scoring rules-4.** Its own commit: the code dedupe in `factors/category.ts`, the region overlap rule documented, `MODEL_VERSION` to `rules-4`, `scoreAll` extracting once per tender and flushing per profile in tender id then profile id order, the golden set checked. No pair is expected to move.
3. **Pipeline and queue.** `storage.ts`, adapter types and registry, `run.ts` with its tests, `registerIngestJobs`, Sentry check-ins, worker wiring, the score-all placeholder removed, `createQueue` plus `updateQueue`, `ingest-once` tool, env example and gitignore.
4. **CanadaBuys adapter.** Columns, text cleaning, dates, regions, buyers, categories, notice kinds, parse tests on the sample file, the golden batch, the integration test.
5. **Acceptance and docs.** Real-file run, the cap check and its report, table fixes, CLAUDE.md (M4 paragraph, API shape, source flag, staging volume), the development guide's data model and scoring sections, this plan's status.

## Later adapters

A new portal starts only after its terms review is saved as `docs/permissions/<code>.md` (what was checked, when, by whom, the permission or licence text, and what the adapter may fetch). The adapter is one folder under `sources/`, one registry line, one source row, its own schedule key and Sentry monitor, a sample file in `fixtures/` and a parser test. Scoring and the screens do not change. The cross-source duplicate check from the guide is built with the second adapter, when there is something to compare.

## Approval (Oct 29, 2026)

Answers to the six questions: 1 array approved; 2 query-level hiding approved; 3 14:00 UTC with the two retries approved; 4 disk fallback approved for staging only, with a persistent volume for `RAW_FILES_DIR` documented and the worker refusing to start in production without `S3_BUCKET`; 5 staging runs on disk until the AWS bucket exists; 6 `src/worker/tools/`.

Changes asked for and folded into the plan above: the row-count failure threshold is 70 percent of the last successful run, not 50; the source row's `active` flag is created from the adapter (CanadaBuys active, later adapters inactive) and never changed by the run, and scoring and the list read only active sources (decision 9); "done" is the local acceptance run plus the merged pull request, the staging week moving to M5; the rules-4 scoring change is its own commit; work stops after each commit for a check.

## Notes from the build

**Commit 1, Oct 29, 2026 (`8495b7f`): schema and shared shape.** Lint, typecheck and the 434 unit and integration tests pass. The full Playwright suite passes against `next dev` (47 passed, 1 skipped by design). The migration converted the 55 fixture rows in place. CLAUDE.md still says the fixtures source is never active; commit 5 rewrites that paragraph for decision 9.

**Commit 2, Oct 29, 2026 (`152bebc`): scoring rules-4.** Lint, typecheck and 437 tests pass; no golden pair moved.

**Commit 3, Oct 29, 2026: pipeline and queue.** Built as planned, with these choices made while building:

- `ingestJobSchema` is a trimmed string, not a Zod enum of registered codes: `src/lib/queues.ts` is shared with the web app and cannot import the worker's registry. The handler parses the payload and then looks the code up in the registry before anything runs, so an unknown source still fails the job before it touches a table, which is what the enum was for.
- One more failure rule: `allRowsSkipped`. A file whose rows all fail validation has had its columns changed, and writing nothing then withdrawing everything would empty the list. It fails the run like `zeroRows`, before the first write.
- A skipped row whose reference number could still be read counts as present in the file, so the stored copy of that notice is kept as it was, not withdrawn. Only a notice that has left the file is withdrawn.
- A duplicate reference number inside one file is written once (the first row) and counted under `skipped.duplicateExternalId`, so `createMany` never trips the unique key.
- The `runJob` wrapper moved to `src/worker/jobs/run-job.ts`, shared by scoring and ingest, with a `report` switch: the pipeline reports its own failure to Sentry with the source, run id and error code, so the wrapper does not report it a second time.
- `registerScoringJobs` lost its `schedule` option, `SCORE_ALL_CRON` and `SCORE_ALL_TZ`; it calls `unschedule("score-all")` on every start (idempotent), and `createQueue` is followed by `updateQueue` for both scoring queues and the ingest queue. Verified against the local database: the 06:15 Toronto row left `pgboss.schedule`, the `ingest` queue shows `stately`, 1800, 2, 900.
- The registry is empty until commit 4 registers CanadaBuys, so the worker schedules no import yet and `npm run ingest -- canadabuys` exits with "No source adapter is registered". `INGEST_ON_STARTUP` with an unknown code stops the worker at start.
- The scaffold's `.env.example ` (trailing space) is now plain `.env.example`; the CLAUDE.md note is rewritten in commit 5.

**Commit 4, Oct 29, 2026: the CanadaBuys adapter.** Built as planned, with these notes:

- Two additions asked for at the commit 3 check: more than 10 percent of rows skipped in one run sends a Sentry warning (`captureMessage`, level warning, tagged with the source and run id, the counts by reason as extra) and adds `highSkipRate` to the run summary; the run still succeeds. An empty, blank, non-string or unknown source code fails the job before anything runs (tests for `""`, `"   "`, `42`, `{}`, `null` and `"merx"`).
- The category table was corrected against the file's own code descriptions (`unspscDescription-eng`), which the plan did not have: 811118 (system administration, LAN and WAN support, help desk) is managed services with 81111801 (computer or network security) under cybersecurity; 811122 (software maintenance and support) is custom software with 81112208 (security software maintenance) under cybersecurity; 811623 (business process as a service: payroll, HR, help desk) is managed services with 81162305 (risk management as a service) under cybersecurity; 811015 is plain civil engineering (the plan's "GIS" reading was wrong: 81101512 is one class in it); 80161604 (IT management services) is managed services. Segment and family codes that notices use on their own (43000000, 72000000, 76000000, 81110000, 81160000) map to the family's default category. Trailing zeros in a UNSPSC code mean "the whole family", so they are dropped before the prefix match.
- The buyer table adds two Crown corporations present in the file (Canada Council for the Arts, Standards Council of Canada) and a federal pattern list, so "unmapped buyers" means a name no rule recognises rather than every ordinary department. Today's file has none.
- The run summary gains `unmapped.noticeTypes`; a new notice type is stored as `OTHER`, hidden, and reported.
- The parser refuses a file whose header lacks any expected column (an `IngestError` with the missing names) instead of skipping every row for a missing title; `allRowsSkipped` still covers a header that is intact but empty of usable rows.
- The sample file through the adapter: 20 rows, none skipped, no HTML left, every per-row expectation from the tests table met. The real file parsed offline (the local copy from Oct 29, not an import): 894 rows, none skipped; unmapped regions are the 17 foreign places; no unmapped buyers or notice types; 685 distinct unmapped codes, the biggest being laboratory equipment (41), environmental services (77), research (8114) and health services (85), all outside the ten categories on purpose; kinds 686 BID, 110 UNKNOWN, 69 RFI, 18 ACAN, 9 OTHER, 2 DIRECTED; 349 notices with at least one category; for the sample Ontario IT profile, 724 scorable notices give 29 High, 50 Medium, 632 capped and 260 gated (BC, Alberta and other single-province notices).
- The golden batch pins kind, eligibility, band and cap for the 20 rows at `now` = Oct 24, 2026 (the day the sample was taken). Rows 7, 11, 12, 13 and 17 are High for the sample profile; 3, 5, 8, 19 and 20 are gated (two conditional set-asides, three provinces); the rest are capped Low, and rows 1 and 2 Medium.
- `src/lib/scoring/canadabuys-sample.ts` and its test are gone; the text helpers live in `sources/canadabuys/text.ts` and the extractor checks moved to the golden test. The CLAUDE.md sentence that names the reader is rewritten in commit 5.
- The CanadaBuys source row's `baseUrl` is `https://canadabuys.canada.ca/en/tender-opportunities`, the page the detail screen sends a user to when a notice has no link of its own.
- The real import was not run from this session, as asked.

**Commit 4b, Oct 29, 2026: the notice page link.** Asked for at the commit 4 check after checking eight sample notices on canadabuys.canada.ca: a notice's page is the tender opportunities listing plus `tender-notice/` and the reference number as a slug (lower case, letters, digits and hyphens only: `SSC-26-00034400:T` opens at `ssc-26-00034400t`, `PW-_NCS-030-11940` at `pw-ncs-030-11940`; the underscore kept gives 404). Seven of the eight opened without an account; `cb-990-11745680` and, twice, `cb-329-8183335` answered 403, so a few notices are restricted. Two pages said "Expired" where the file says Open, which the closing-date filter already covers. The adapter builds the link (`sources/canadabuys/notice-url.ts`) into a new nullable `Tender.noticePageUrl` (migration `20261029200000_m4_notice_page_url`), the tender schema and `OpportunityItem` carry it, and the detail screen's notice link only chooses: a link in the file gives a primary button named by its domain ("Open the notice on merx.com") plus a secondary "View on CanadaBuys"; no link in the file gives the primary "Open the notice on CanadaBuys" with the reference number, the copy button and "If the notice does not open, it may need a CanadaBuys account."; neither (the fixtures) keeps the earlier fallback. No account and no login anywhere in the code. The reference number is not searchable on the site; it is only this slug.

**Commit 5, Oct 29, 2026: acceptance and docs.** Also asked for at the commit 4b check: the ingest schedule registers only when `INGEST_SCHEDULE=on` (off by default on a laptop and in CI, on in staging and production); when it is off the worker removes any schedule a previous start left in the database, so the one the Playwright worker created locally on Oct 29 disappears on the next start. Documented in `.env.example` and CLAUDE.md. `npm run ingest:check -- <file.csv>` (`src/worker/tools/canadabuys-check.ts`) prints the category cap acceptance report; its verdict reads the notice titles for the profile's keywords and lists description-only hits for the human read, because a single generic word such as "development" in an engineering notice is not a read. CLAUDE.md gained the M4 ingestion paragraph, the API field list, the fixtures source flag, the staging volume and the rules-4 note, and lost the trailing-space filename note; the development guide's data model, scoring and ingestion tables follow. Lint, typecheck, 688 tests and the Playwright suite pass. The report follows.

**Known issue: the phone focus test under a production build.** Run against `next build` plus `next start` (which the suite does not normally do), `e2e/accessibility.spec.ts` "listing detail: has one H1, a main landmark and a visible focus path" fails on the phone project only: after `openListing` taps the first title link and the detail page loads, the first Tab press moves focus out of the document (`document.hasFocus()` is false and `activeElement` is `body`); the second Tab lands on the skip link. On desktop the first Tab lands on the breadcrumb link. The `development` branch built the same way, against a throwaway database, fails identically, so it predates M4 and comes from tap navigation under touch emulation on a production build, not from the page. It passes against `next dev`, which is what CI and `npm run e2e` use. Left as is; worth a note in the M5 accessibility pass if the suite ever runs against a build.

## Acceptance report (Oct 29, 2026)

Run by the project owner with `npm run ingest -- canadabuys` against the local database (two runs, 05:52 and 07:01 UTC; the second filled the notice page links). The category cap check ran offline on the stored raw file with `npm run ingest:check`, after the table changes below. The scoring weights were not changed.

**Run summary (07:01 UTC run, from `ingest_run.summary`).**

| Field | Value |
| --- | --- |
| Rows found | 894 (previous successful run 894) |
| Inserted, updated, withdrawn, restored | 0, 894, 0, 0 |
| Skipped | 0 |
| Warnings | none |
| Duration | 17155 ms |
| File | 6115661 bytes, SHA-256 `b53a18d9d66abb34...`, Last-Modified 2026-10-28T10:20:41.000Z, ETag `0x8DF34DD1E670744`, content type `application/octet-stream`, stored at `canadabuys/2026/10/29/openTenderNotice-ouvertAvisAppelOffres-070120Z.csv` |

**Unmapped values (the run summary keeps the top 20 per table).**

- Regions (all foreign places, mapped to CA): United States of America (6), Asia (4), Europe (4), Africa (3), Caribbean (3), Central America (3), Mexico (3), South America (3), Germany (2), Oceania (2), Algeria (1), China (1), Indonesia (1), Japan (1), Lebanon (1), Philippines (1), South Korea (1).
- Buyers: none. Notice types: none.
- Category codes, top 20 of 681 distinct: 41100000 (27), 56101700 (15), 81141902 (9), 25111900 (8), 40141600 (7), 25181700 (6), 25200000 (6), 55111500 (6), 73152108 (6), 80122001 (6), 85101700 (6), 92111700 (6), 22101500 (5), 25111500 (5), 25132102 (5), 39120000 (5), 39121700 (5), 41110000 (5), 77000000 (5), 77101500 (5). These are laboratory equipment (41), furniture (56), research and development (8114), vehicles and machinery (25), legal and real estate (8012, 8013), environmental (77) and health services (85), outside the ten categories on purpose.

**Counts for the sample profile (Ontario IT firm) after the table changes.** > tsx src/worker/tools/canadabuys-check.ts .data/raw/canadabuys/2026/10/29/openTenderNotice-ouvertAvisAppelOffres-070120Z.csv. . In the database before the table changes the same profile had 30 High, 49 Medium, 385 capped Low and 260 gated.

**High notices (27), title and score.**

| Score | Reference | Title | Codes mapped to |
| --- | --- | --- | --- |
| 81 | `WS3430950409-Doc5344784278` | Electronic Health Record Platform (EHRP)-Invitation to Qualify (ITQ) R | custom-software-saas, it-managed-services-cloud |
| 79 | `cb-869-30702733` | TBIPS Change Management Consultant Level 3 | custom-software-saas |
| 79 | `cb-953-98325012` | IT Security Professional Services Under the Task-Based Services Supply | it-managed-services-cloud |
| 79 | `WS3971158100-Doc3971158168` | Software Licensing Supply Arrangement (SLSA) RFSA | custom-software-saas |
| 79 | `WS4125166145-Doc4243461216` | EN578-191593F RFSA - SaaS Method of Supply (GC Cloud) | custom-software-saas |
| 78 | `SSC-26-00035268:T` | Data Erasure- RFP | custom-software-saas |
| 78 | `cb-26-24814736` | Digital Talent Services | custom-software-saas |
| 78 | `cb-313-36103614` | Gather data and maintain the alternative fuel station database | it-managed-services-cloud |
| 78 | `cb-181-76348100` | Request for Supply Arrangement for Technical Integration Services for | it-managed-services-cloud, custom-software-saas |
| 78 | `WS4219842924-Doc5603700321` | Ongoing Qualification RFSA - Perimeter Security Management System and | it-managed-services-cloud, cybersecurity-data-protection |
| 78 | `WS5935625437-Doc5945491432` | Parliamentary Precinct Network Infrastructure Transformation | it-managed-services-cloud |
| 77 | `cb-536-24115079` | IT Professional Services | management-consulting, custom-software-saas |
| 77 | `cb-346-24044821` | Web-based Platform for Whole Building Life Cycle Analysis (WBLCA) and | custom-software-saas |
| 76 | `SSC-26-00034400:T` | Local Internet Access Services (LIAS) | it-managed-services-cloud |
| 76 | `SSC-22-00020507:T` | Local Internet Access Services RFSA | it-managed-services-cloud |
| 76 | `SSC-26-00035216:T` | ATEN Products, or equivalent, for the Department of National Defence. | it-managed-services-cloud |
| 76 | `WS4102449949-Doc4106230724` | W6399-22CA50C Miscellaneous Communication Equipment | it-managed-services-cloud |
| 76 | `WS5286859961-Doc5287556087` | Communications Management and Monitoring Equipment RFSA | it-managed-services-cloud |
| 76 | `WS4856241079-Doc5643313188` | ITQ results DIGITAL REGISTRY SOLUTION (DRS) U6265-275951-B | it-managed-services-cloud, custom-software-saas, cybersecurity-data-protection |
| 76 | `WS4286933967-Doc4822970058` | Invitation to Qualify to Artificial Intelligence Source List | custom-software-saas |
| 76 | `cb-965-17321735` | Application/Software Architect – Level 3 for Drupal | custom-software-saas, it-managed-services-cloud |
| 76 | `WS5869934399-Doc5885635305` | Canadian Student Alcohol and Drugs Survey (CSADS). | it-managed-services-cloud |
| 76 | `WS5942246975-Doc5942297703` | 5P300-260186- Geosystems Survey Equipment Replacement | it-managed-services-cloud |
| 76 | `cb-327-26516930` | Simulation Hardware & Peripherals | it-managed-services-cloud |
| 76 | `MX-444150458321` | RFP_IT_Maximo Spare Parts Tool_Phase 1_2026 | - |
| 76 | `WS5820650376-Doc5820832341` | HCM Data Integration and Enablement Services | it-managed-services-cloud, custom-software-saas, cybersecurity-data-protection |
| 76 | `WS3991178614-Doc5935815036` | Refresh #1 – RFSO EN578-221793-B_Digitization Services | it-managed-services-cloud |

**30 of the other capped notices (every 19th by file order), title and the codes they carried.**

| Score | Reference | Title | Codes in the file | Mapped to |
| --- | --- | --- | --- | --- |
| 49 | `MX-443841357513` | Open Construction Source List for CFB Halifax | - | none |
| 49 | `MX-443841876262` | Open Construction Source List for Northern Canada | - | none |
| 49 | `MX-444195744611` | Request for Expression of Interest (RFEOI) for Enniskillen Road Upgrad | - | none |
| 40 | `cb-112-87725383` | Wheel Chocks / Cale de Roue Tire Chains / Ensemble De Chaines Pour Pne | 25172100 | none |
| 49 | `cb-292-23373661` | Terminal Taper Pin Electrical | 39121400 | none |
| 49 | `cb-629-72290055` | Simulation‑Based Nursing Education Services (SIMS), Ontario Region | 42300000, 42301500, 86101605 | medical-equipment-pharma |
| 47 | `cb-811-34971855` | Control of invasive alien plant species | 70141603 | none |
| 49 | `cb-4-54243300` | Request for Offers for the provision of Cleaning Services for the Emba | 76110000 | facilities-janitorial |
| 49 | `cb-466-63260269` | Project Executive Consulting Services | 80101706 | management-consulting |
| 49 | `PW-__HP-539-79947` | Buses, Electric | N2310 | none |
| 49 | `WS4332350868-Doc4332354230` | E60HN-200ACS - Access Control Systems RFSA | 26121600, 32131000, 39121100, 39121300, 39121400, 39121500, 391... | none |
| 49 | `WS5386713014-Doc5386719620` | E6TOR-25RM01 Compressed Gas and Welding Supplies | 12142101, 12142104, 12142105, 12142106, 23271700, 23271800, 241... | none |
| 49 | `WS4095676068-Doc4095807190` | Buses, Electric RFSA | 25101502 | none |
| 40 | `WS5769496901-Doc5769633356` | W684H-260279 - RFSA - Brush Clearing - CFB Halifax Various Sites | 70150000 | none |
| 49 | `MX-443840130693` | Open Construction Source List for CFB Kingston | - | none |
| 47 | `cb-866-65312742` | RFSA - British Columbia Coastwide Ecosystem Monitoring Service | 70100000, 70101602, 70101800 | none |
| 49 | `cb-107-78365176` | CABLE, SPECIAL PURPOSE, ELECTRICAL | 26121500 | none |
| 49 | `WS5932342839-Doc5933526112` | W0125-27TEM2 (B) Petroleum, Oil and Lubricant Products | 15120000, 15121500, 15121501, 15121503, 15121504, 15121509 | none |
| 38 | `WS5902285068-Doc5918245600` | F1782-26C206 - CCGS Gordon Reid Alongside Refit | 78182000 | logistics-freight-3pl |
| 37 | `cb-870-21953670` | Tube,Metallic | 40170000 | none |
| 49 | `WS5790264815-Doc5790283285` | T86 Rooftop Units Replacement | 72000000 | commercial-construction |
| 36 | `WS5576291337-Doc5897126663` | E6MON-26PQFL - Period 08 - RMSO Food - Fresh Fruits and Vegetables | 50300000, 50400000 | none |
| 49 | `cb-426-96674657` | 74 Height-Adjustable Extended-Corner Workstations | 56101703 | none |
| 43 | `WS5916589753-Doc5921893944` | RFP - SNOW REMOVAL AND ICE CONTROL SERVICES | 72102903 | facilities-janitorial |
| 43 | `cb-118-86363151` | Supply, install , commission HVAC, lights and controls and associated | 30191800 | none |
| 37 | `WS5862734181-Doc5895485610` | Class 5 Diesel Medium Truck with Flat deck | 25101917 | none |
| 49 | `cb-957-88702220` | Office Furniture: Categories 1, 2,3,4,5 and 6 Jasper National Park | 56101500, 56101700 | none |
| 40 | `WS5774350607-Doc5869818405` | W6899-270194 - Pre-fabricated structures - CFB Greenwood | 72121102, 95140000, 95141600, 95141700 | commercial-construction |
| 34 | `cb-437-59896557` | De-Icer Spare Parts | 25101935, 25191500, 40101842, 46161506, 56111905 | none |
| 36 | `WS5609648156-Doc5749913291` | W684Q-264141 - Laboratory Testing - RFSO | 77121707 | none |

**The 43 and 81 notices held at Low by the cap: 61.** All read, none is managed IT, cybersecurity or custom software: they are professional engineering (8110: marine, electrical, civil, commissioning, dam and harbour design), earth sciences (8115: hydrography, LiDAR, surveying, archaeology, diving), research and development (8114: C4ISR, zero-emission propulsion, space technology, blast injury simulation), environmental consulting and a few goods with an 81 code attached (talc, a flatbed trailer). The tool's title measure flagged one, "High-Precision Control Network Eastern Bridge", on the word "network"; it is a geodetic survey control network (81151604, land surveying). Nineteen more carry a single generic word such as "development" or "security" in a long engineering description. **The check passes**: no 43 or 81 notice that reads as the profile's work is capped, and the sampled capped notices are all outside its categories. The cap rule for coded tenders stays as it is.

**Table changes made during the check, and why.**

- `432120` (computer display accessories: monitor arms and stands) now maps to none. It put "EP916-260561 Workspaces Cat 1-6", an office furniture notice, at 76 High because one of its five codes was a monitor arm.
- `811119` (information retrieval systems: database and online information retrieval) now maps to none. It put "Flight passenger traffic and flight schedule data" and "Subscription Agent Services" at High; both are data and publication subscriptions, a vendor's product rather than IT services.
- The category table gained a "none on purpose" entry type for these, narrower than the family above them, so they are not reported as unmapped. Three High and four Medium notices moved to Low; nothing moved up.
- The real-file findings from commit 4 stand: the corrections to 811118, 811122, 811623, 811015 and 80161604, the family defaults for 43, 72, 76, 8111 and 8116, and the two Crown corporations.
- Still High on hardware and data-collection codes, left as they are for the product owner to judge: "Geosystems Survey Equipment Replacement" (a GPS antenna class), "Simulation Hardware and Peripherals", "Miscellaneous Communication Equipment", "ATEN Products" (KVM hardware) and "Canadian Student Alcohol and Drugs Survey" (coded as data services). The ten categories have no "IT hardware" or "data collection" entry, so segment 43 and family 811120 both fall to managed services.
- The stored scores in the local database were computed before the two table changes. The next import rewrites every notice's category codes and chains a rescore, so the database follows the table on its own.
