# M2 Scoring engine: build plan

Oct 23, 2026 · Status: built (approved Oct 24, 2026)

Milestone M2 from docs/development-guide.md: rules in `src/lib/scoring` as pure functions, one per factor, with the eligibility gate and the High, Medium, Low bands; table-driven Vitest tests per factor; `fixtures/golden.json` with 20 tender and profile pairs and expected bands; `reasons.ts` with fixed templates and no AI call; a worker job that scores every tender for every profile into the `score` table.

Done when the golden set and the reasons tests pass, and the sample IT Managed Services tender scores 92 with factors 38, 19, 14, 12 and 9 for the sample profile.

## What the rules can see

Tenders carry no structured requirements, only a title and description, so a small deterministic extractor turns the text into facts the rules use. It is plain pattern matching, not AI, and it is a pure function with its own tests.

`src/lib/scoring/requirements.ts` reads title plus description and returns:

| Fact | Detected from | Used by |
| --- | --- | --- |
| `certifications` | SOC 2, ISO 27001, ISO 9001, professional engineering licence, Health Canada licence | credentials |
| `bondRequired` | bid bond, performance bond, bonding | eligibility checks and reasons |
| `clearanceRequired` | security clearance, Reliability, Secret | eligibility checks |
| `residencyCanada` | data must stay in Canada, Canadian cloud region, data residency | eligibility checks |
| `setAside` | set-aside, set aside, reserved for | the gate |
| `afterHours` | 24/7, 24 hours, after-hours, on-call | capacity |
| `referencesRequired` | references, reference projects | credentials |
| `keywordHits` | category keyword lists, five terms per category | category |

The extractor runs inside the scoring call, so no schema change and no new migration. M4 can persist the facts on the tender later if the UI needs them.

## Factor rules and how the sample lands on 92

Sample profile (seeded): categories managed IT, cybersecurity, custom software; buyers municipal, provincial, health, crown; Ontario; English; $250K to $3M; 6 to 10 people; 10-day lead time; SOC 2 Type II; no bonding; has a description.

Sample tender (FIXTURE-0001): managed IT category, municipal, Ontario, $1.0M to $1.4M range, closes in 9 days, English; text mentions SOC 2 Type II or ISO 27001, three references, a performance bond, 24/7 coverage, data staying in Canada.

Points round half up at the component level. Each factor returns its points, its maximum, and the facts it used, so reasons never recompute anything.

**Category match, 40.** `codePoints` (max 24) is 24 times the share of the tender's category codes the profile lists; a tender with no codes uses the keyword share instead. `buyerPoints` (max 8) is 8 when the tender's buyer type is in the profile's list, 4 when the buyer type is unknown, 0 otherwise. `keywordPoints` (max 8) is 8 times the share of the matched category's five keywords found in the text. Sample: 24 + 8 + 8 × 4/5 (managed services, help desk, cloud, network hit; data centre misses) = 24 + 8 + 6 = **38**.

**Location and eligibility, 20.** `regionPoints` (max 12): 12 when the tender's region is in the profile's regions, or either side is CA. `languagePoints` (max 5): 5 when the profile can deliver in the tender's language (EN_FR covers all), 3 when a bilingual tender meets a single-language profile, 0 when a French-only tender meets an English-only profile or the reverse. `checksPoints` (max 3): 3 times the share of detected eligibility items the profile satisfies, out of residency in Canada (satisfied by a Canadian head office), bond (satisfied by `bonding`), and clearance (never satisfied in phase 1, the profile has no field); 3 when nothing is detected. Sample: 12 + 5 + 3 × 1/2 (residency yes, bond no) = 12 + 5 + 2 = **19**.

**Contract size, 15.** `fitPoints` (max 12): 12 when the tender's value overlaps the profile's range, falling off by 3 for each doubling outside it, 6 when the tender publishes no value, 12 when the profile set no range. `certaintyPoints` (max 3): 3 for a single stated value, 2 for a range, 1 for no value (so an unknown value scores 6 + 1 = 7, the guide's "half"). Sample: 12 + 2 = **14**.

**Timeline and capacity, 15.** `timePoints` (max 10): 10 when days until close is at or above the profile's lead time, otherwise 10 times days left over lead time; 10 when no lead time is set. `capacityPoints` (max 5): 5 unless the tender needs after-hours coverage and the team band is 1-5 or 6-10, then 3; 1-5 with after-hours is 2. Sample: 10 × 9/10 + 3 = 9 + 3 = **12**.

**Credentials, 10.** `certificationPoints` (max 7): 7 when the profile holds any of the detected certifications (alternatives are usually joined with "or"), 7 when none are detected, 0 when some are detected and none held. `experiencePoints` (max 3): 3 when no references are requested, 2 when they are and the profile has a description, 0 when they are and it has none. Sample: 7 + 2 = **9**.

**Gate.** `eligible` is false when the tender's province is outside the profile's regions (and neither side is CA) or the tender is a set-aside for a group the profile cannot claim. Ineligible tenders keep their factor points so the detail page can show them, but the band is LOW and the summary names the blocker. The score is still saved; the list hides it by default, as M1 already does.

**Bands.** 75 to 100 High, 50 to 74 Medium, under 50 Low, from `bandForTotal` in the vocab.

Total for the sample: 38 + 19 + 14 + 12 + 9 = **92**, High.

## Files

- `src/lib/scoring/types.ts`: `ScoringProfile`, `ScoringTender`, `FactorResult`, `ScoreResult`.
- `src/lib/scoring/requirements.ts` and `keywords.ts`: the extractor and the ten keyword lists.
- `src/lib/scoring/factors/category.ts`, `location.ts`, `size.ts`, `timeline.ts`, `credentials.ts`: one pure function each.
- `src/lib/scoring/gate.ts`, `score.ts` (`scoreTender(tender, profile, now)` returning total, band, eligible, factors, facts).
- `src/lib/scoring/reasons.ts`: see below.
- `src/lib/scoring/run.ts`: `scoreAll(db, { profileId?, now })` loads open tenders and profiles, upserts `score` rows with `modelVersion = "rules-1"`.
- `src/worker/jobs/scoring/index.ts`: registers the `score-all` and `score-profile` queues on the pg-boss instance from `src/worker/main.ts`, with a singleton key so two runs never overlap.
- `fixtures/golden.json`, `src/lib/scoring/golden.test.ts`, and a table-driven test file beside each factor.

## Reasons

`reasons.ts` turns a `ScoreResult` into the three lists the listing detail shows (in your favour, gaps to close, could rule you out) plus a two or three line `summary` for the list row. Every reason is stored as `{ code, params, text }`: the English `text` comes from fixed templates now, and the `code` and `params` let the UI render French later without rescoring. Candidate templates, highest priority first:

- In favour: "Matches your category: {category}", "{Buyer type} is a buyer you work with", "The value sits inside your range", "You hold {certification}, which is required", "Closes in {days} days, inside your lead time".
- Gaps: "24/7 coverage goes beyond a team of {band}", "{n} references are requested", "A performance bond is required and your answers say no bonding", "Closes in {days} days, under your {lead} day lead time", "The value is above your range", "Bilingual delivery is required".
- Could rule you out: "Outside the provinces you work in", "Set aside for {group}", "A security clearance is required", "French-only submission".

The summary takes the top reason in favour, then the top gap or blocker, then a second favour when there is room, which gives two or three lines. Category labels for the templates come from a small English label map in `src/lib/scoring/labels.ts`; messages for the UI arrive in M3.

## Golden set

`fixtures/golden.json` holds 20 pairs. Each pair names a fixture tender by `externalId` (reusing `fixtures/tenders.json`, with the same day offsets resolved against a fixed `now` of 2026-10-23) and an inline profile, with `expectedBand` and `expectedEligible`, and for the sample pair the exact `expectedTotal` 92 and the five factor points. Profiles: the sample profile, a Quebec facilities firm that delivers in French only, an Alberta construction contractor with bonding, a nationwide consultancy with a Reliability-cleared team, an Indigenous-owned logistics firm in Manitoba, and a small Ontario software shop. The pairs cover every factor's edge: province gate, set-aside gate, French-only submission, unknown value, value far above range, closing tomorrow, after-hours with a small team, missing certification, no references on file.

Expected bands are written from the rules above before the engine runs, and the test fails on any difference. If a pair's band turns out wrong, the rule is tuned and the change is noted in the pull request, as the guide asks.

## Worker job

`score-all` loads all profiles and all tenders that have not closed, scores each pair, and upserts the row on `(tenderId, profileId)` in batches of 500. `score-profile` does the same for one profile and is what `PUT /api/profile` will enqueue in M3. Both carry a singleton key so a retry never runs alongside the original. The worker schedules `score-all` nightly at 06:15 Eastern as a placeholder; M4 chains it after the CanadaBuys import instead. Outside production the worker also enqueues one `score-all` at startup so a fresh database has scores within seconds.

`GET /api/opportunities` already returns real score rows when they exist, so the list shows totals as soon as the job has run. Ordering by score (`sort=score`) still falls back to closing date; adding the score keyset is a small follow-up once the rows exist, and I would do it in M3 with the list screen unless you want it in M2.

## Tests

- Table-driven tests per factor: each row is a profile fragment, a tender fragment and the expected points.
- Extractor tests: one row per fact, including negatives such as "Indigenous-owned proponents are encouraged" not counting as a set-aside.
- Gate and band tests.
- Reasons tests: the sample pair produces the wireframe's reasons (first category and buyer in favour, 24/7 and references as gaps, the bond as a blocker) and summaries are two or three lines.
- Golden test: 20 pairs, bands and eligibility, exact factors for the sample.
- Job test with a mocked database, plus an integration test that seeds fixtures and the dev profile, runs `scoreAll`, and asserts 55 score rows with the sample at 92.

## Assumptions you can override

- Requirements are extracted from text at scoring time rather than stored on the tender.
- A security clearance requirement costs points but does not gate; a province mismatch and a set-aside do gate.
- French-only submissions to an English-only profile cost the language points but do not gate, matching the wireframe's 38-point example.
- Reasons are stored as code, params and English text, so French can be rendered later from the codes.
- The nightly schedule is a placeholder until M4 wires scoring after the import.

## Out of scope

AI-written reasons, the questionnaire and list screens (M3), `PUT /api/profile` (M3), CanadaBuys ingestion (M4), score ordering in the list endpoint.

## Built (Oct 24, 2026)

What landed, and where it differs from the plan above:

- Everything in the Files section exists as planned, plus `src/lib/scoring/golden.ts` (the golden loader), `src/lib/scoring/test-helpers.ts`, `src/lib/scoring/index.ts` (barrel) and `src/lib/queues.ts` (queue names shared by web and worker; `QUEUES` moved out of `src/worker/main.ts`).
- `SAMPLE_PROFILE` moved to `src/lib/seed/sample-profile.ts` so tests can import it without loading Better Auth. `dev-account.ts` re-exports it.
- A bond the profile cannot post is listed under "could rule you out", not "gaps to close": a buyer rejects a bid without it. It still does not gate, because the company can obtain bonding.
- The extractor also detects `bilingualRequired` from the text; a bilingual notice counts as EN_FR for the language points even when the notice is in one language.
- Text normalization turns hyphens into spaces so "data-centre" matches "data centre".
- Golden pairs may patch `description` or `closesInDays` on a fixture tender, used for the set-aside and closing-tomorrow cases that no fixture carries.
- Vitest now runs two projects: unit tests in parallel, then `*.int.test.ts` one file at a time, because the two integration tests share the fixture rows.
- The sample pair scores 92 with 38, 19, 14, 12 and 9; all 20 golden pairs match their expected band and eligibility; 246 tests pass; the real worker wrote 55 score rows for the dev profile in 148 ms.

Follow-up decided Oct 24, 2026 (docs/plans/m2-category-cap.md): a tender with fewer than 10 category points is capped at 49 and shows as Low, modelVersion rules-2. Golden pairs `sample-construction-far-above-range` and `sample-consulting-roadmap`, which this note first flagged at 58 and 66, now sit at 49.
