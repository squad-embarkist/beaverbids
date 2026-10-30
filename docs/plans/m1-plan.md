# M1 Data model and fixtures: build plan

Oct 23, 2026 · Status: built Oct 23, 2026 on feature/m1-data-model

Milestone M1 from docs/development-guide.md, scoped as requested: five tables (companyProfile, source, ingestRun, tender, score), shared Zod schemas, a fixture seed of about 50 fictional tenders, and `GET /api/opportunities` with cursor pagination and a placeholder score. draftProfile, savedTender, digest and event wait for later phases. Better Auth keeps its own tables; pg-boss tables are not modelled.

Done when the seed loads on a clean database and the endpoint returns it.

## Vocabulary taken from the wireframes

The questionnaire and listing screens in the wireframes fix the option lists, so the schemas use them as codes rather than free text.

| List | Values |
| --- | --- |
| Categories (10) | it-managed-services-cloud, cybersecurity-data-protection, custom-software-saas, healthcare-it-ehr, commercial-construction, civil-engineering-infrastructure, medical-equipment-pharma, facilities-janitorial, logistics-freight-3pl, management-consulting |
| Buyer types (9) | municipal, provincial, federal, health-authority, education, crown-utility, transit, defence-public-safety, indigenous-government |
| Regions | The 13 province and territory codes (ON, QC, BC, AB, MB, SK, NS, NB, NL, PE, NT, YT, NU) plus CA for all of Canada |
| Languages | EN, FR, EN_FR (the "languages you can deliver in" step; the tender's language of submission uses the same enum) |
| Team size bands | 1-5, 6-10, 11-25, 26-50, 51-200, 200+ |
| Score bands | HIGH 75 to 100, MEDIUM 50 to 74, LOW under 50 |

These live in `src/lib/schemas/vocab.ts` as `as const` arrays, so Zod, Prisma seed data and later the UI share one source.

## Prisma schema

Every table has `id String @id @default(uuid(7))`, `createdAt` and `updatedAt`. Money is stored as whole CAD dollars. Columns marked "added" are not in the guide's table; they come from the questionnaire screens and the five scoring factors, and the guide allows the columns to grow as long as the relations hold.

**CompanyProfile** (`company_profile`). `userId` unique, relation to the Better Auth `User`. `name`, `website?`, `description?` (the work you most want to win, added), `headOfficeProvince?` (added), `categories String[]`, `buyerTypes String[]` (added, feeds the 40-point factor), `regions String[]`, `languages Language` (added), `sizeMin Int?`, `sizeMax Int?`, `capacity String?` (team size band code), `timelinePref Int?` (minimum days needed to respond), `certifications String[]`, `bonding Boolean` (added, the "could rule you out" case), `questionnaireStep Int` (highest completed step, for "Save and finish later").

**Source** (`source`). `code` unique, `name`, `baseUrl`, `active Boolean`, `lastSuccessAt?`.

**IngestRun** (`ingest_run`). `sourceId`, `startedAt`, `finishedAt?`, `status IngestRunStatus` (RUNNING, SUCCEEDED, FAILED), `rowsFound Int?`, `error?`.

**Tender** (`tender`). `sourceId`, `externalId`, `title`, `buyer`, `buyerType String?` (added), `description`, `categoryCodes String[]`, `region String` (province code or CA), `valueMin Int?`, `valueMax Int?`, `publishedAt`, `closesAt` (indexed), `language Language`, `officialUrl`, `rawFileKey?`. Unique on `(sourceId, externalId)`.

**Score** (`score`). `tenderId`, `profileId`, `total Int`, `band ScoreBand`, `eligible Boolean`, `factors Json` ({ category, location, size, timeline, credentials }), `reasons Json` ({ inFavour, gaps, ruleOut } string arrays, matching the listing detail's three lists), `modelVersion String`, `scoredAt`. Unique on `(tenderId, profileId)`, index on `(profileId, total desc)`.

One migration, `m1_data_model`. The Better Auth models stay as generated. `prisma7.config.ts` gains `migrations.seed` so `prisma migrate reset` seeds too.

## Zod schemas in src/lib/schemas

- `vocab.ts`: the lists above and their Zod enums.
- `company-profile.ts`: `companyProfileSchema` for the full questionnaire answers, plus one schema per step (basics, categories, regions, size, credentials) so M3 can validate a step at a time. Rules: at least one category, at least one region, `sizeMin <= sizeMax`, codes from the vocab only.
- `tender.ts`: `tenderInputSchema`, the normalized shape every source adapter must produce before a tender is saved (closesAt after publishedAt, codes from the vocab, officialUrl a URL). The CanadaBuys adapter in M4 targets this schema.
- `opportunities.ts`: `opportunitiesQuerySchema` for the endpoint's query string.

Error messages stay translation keys, as in the auth schemas.

## Seed

- `fixtures/tenders.json`: about 50 fictional tenders. The file starts with a `_fixture` note saying the data is invented, every `externalId` starts with `FIXTURE-`, buyers are the wireframes' "City of Sample, ON" style names, and `officialUrl` points at example.com. Closing and posting dates are stored as day offsets (`closesInDays`, `postedDaysAgo`) so the seed is always current and the M2 golden set stays deterministic. Spread across all ten categories, the main provinces, all buyer types, values from "not stated" to a few million, and English, French and bilingual submissions. The wireframe examples are included, starting with "IT Managed Services and Cloud Infrastructure Support" for City of Sample, Ontario, valued at about $1.2M.
- Fixtures attach to a `fixtures` source row (`active: false`, name "Fixture tenders (fictional)"), never to `canadabuys`, so fixture rows can never be mistaken for real notices.
- `src/lib/seed/fixtures.ts` exports `seedFixtures(prisma)`: upserts the source and each tender on `(sourceId, externalId)`, so the seed is safe to rerun. `prisma/seed.ts` is the thin runner behind `npm run db:seed`.
- Outside production the seed also creates one dev account (`dev@beaverbids.test`) with the sample company profile from the wireframes' "Scoring you against" panel: managed IT, cybersecurity and custom software; municipal, provincial, health and crown buyers; $250K to $3M; Ontario; English only; 6 to 10 people; SOC 2 Type II; no bonding. That is the profile the M2 golden set scores the sample tender at 92 against. Skipped when `NODE_ENV` is production.

## GET /api/opportunities

- Signed-in users only; otherwise 401 with `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }`. A user without a profile still gets the list, since the questionnaire arrives in M3.
- Query: `limit` (default 25, max 100), `cursor`, `sort` (`score` or `closing`), `band`, `region`, `category`, `valueMin`, `valueMax`, `closesBefore`, `q` (title and buyer, case-insensitive), `includeIneligible`. Invalid input returns 400 with the same error shape.
- Default: open tenders only (`closesAt` in the future), newest closing first is not the default; the default sort is `score`, which in M1 falls back to closing soonest because every score is a placeholder. When real score rows exist for the user's profile they are joined in and `sort=score` orders by them. Ineligible scores are hidden unless `includeIneligible=true`.
- Cursor: keyset on `(closesAt, id)` encoded as base64url JSON, so a page is stable while rows are inserted.
- Response: `{ "items": [...], "nextCursor": "..." | null }`. Each item carries the tender fields, `source { code, name }`, and `score`. The placeholder score is `{ "total": null, "band": null, "eligible": true, "placeholder": true }` until M2 writes real rows. A real row replaces it with `total`, `band`, `eligible`, `factors`, `reasons`, `modelVersion` and `placeholder: false`.
- Code layout: `src/lib/opportunities.ts` holds the query builder and the cursor helpers (pure, testable); the route handler only parses, authenticates and serializes.

## Tests

- Unit: vocab and profile schemas (step rules, size ordering), tender input schema, query schema (defaults, limits), cursor encode and decode round trip, route handler with a mocked session and mocked database (401, 400, response shape, nextCursor).
- Integration, run in CI against the Postgres service and locally against Docker: on a clean database run the migration and `seedFixtures`, assert about 50 tenders and one fixtures source, then page through `listOpportunities` with limit 20 and assert every tender appears exactly once and the sample tender is among them. Skipped when `DATABASE_URL` is unset.
- Verification for the report: `prisma migrate reset` on the local database, `npm run db:seed`, then the endpoint over HTTP with a signed-in cookie, showing the first page and the second page via `nextCursor`.

## Assumptions you can override

- IDs are UUID v7 strings. Better Auth keeps its own id format for its tables.
- `region` is one province code or CA per tender, as the guide has it. A tender open to several provinces is stored as CA.
- The fixtures source is a separate row rather than `canadabuys`, so fixture data is never counted as real notices.
- The placeholder score has a null total rather than an invented number, so nothing on screen can be read as a real score.
- The dev account and sample profile are seeded outside production. Say so if you would rather the seed never creates users.

## Out of scope for M1

Scoring rules and the golden set (M2), the questionnaire and list screens (M3), CanadaBuys ingestion (M4), save, hide, digest and events (later phases).
