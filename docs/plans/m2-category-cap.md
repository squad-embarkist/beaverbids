# M2 change: category cap

Status: built Oct 24, 2026 on feature/m2-scoring (threshold: under 10 category points, option B; reason code `categoryCap`; word-boundary keyword fix included as its own commit; sample reader built, CanadaBuys golden batch waits for the M4 parser). Revised Oct 26, 2026 after code review: the threshold reads code plus keyword points only (see Decisions taken, Oct 26).
Source of truth: docs/development-guide.md, Scoring engine section.

## Decision

If category match earns 0 points, the total score is capped at 49. The band is therefore Low.

## Why

A tender with no category match can still reach 58 from location, contract size, timeline and credentials alone, and show as Medium. Example for the sample IT profile: a recreation centre construction tender scores 58 and a consulting roadmap scores 66. A user would see a Medium match for work their company does not do, which makes the score untrustworthy.

## Rule

- Compute the five factors as today (category 40, location and eligibility 20, size 15, timeline 15, credentials 10).
- If category points = 0, total = min(total, 49).
- Bands are unchanged: 75 to 100 High, 50 to 74 Medium, under 50 Low.
- The eligibility gate is unchanged and separate. A gated tender is still hidden by default.
- The factor values stored in the score table stay as computed. Only the total is capped.
- Record the cap in the stored result so the screen can explain it, for example a reason with code `category_cap` and text "No category match, so this tender is capped at Low."
- Bump modelVersion from "rules-1" to "rules-2".

## Out of scope

- No change to any weight or band threshold.
- No AI call.
- No screens or styling.

## Open question (decide after reviewing the numbers below)

Does a very low but non-zero category score (for example under 10 of 40) need the same cap? Do not change the rule until this is reviewed.

## What the implementation plan must show before any code is written

1. Every golden pair whose score or band would change, with old score, new score, old band and new band.
2. Every fixture tender with category points under 10, with its current score and band.
3. The files that would be edited.
4. The tests that would be added.

## Tests to add

- Category 0 with a high total elsewhere: total is exactly 49 and band is Low.
- Category 0 with a total already below 49: total is unchanged.
- Category 1 (non-zero) with the same other factors: no cap applied.
- The sample pair still scores 92 with factors 38, 19, 14, 12, 9.
- Golden set: add at least 2 pairs that prove the cap, and keep the other pairs unchanged unless the plan lists them.
- The cap reason is stored on capped results.
- Rerunning the scoring job twice creates no duplicate rows.

## Done when

- npm run lint, npm run typecheck and npm test all pass.
- The recreation centre construction tender no longer scores above 49 for the sample IT profile.
- The golden set, this plan and the Development Guide agree.
- The project brief still shows the old scoring text and should be updated separately.
## Implementation plan

Drafted Oct 24, 2026 from the engine on `feature/m2-scoring` (modelVersion rules-1). Numbers come from running the current rules over the golden set and over all 55 fixture tenders against the sample IT profile, with `now` fixed at 2026-10-23. No code has been changed.

### A finding that changes the numbers

The category factor is built from three parts: 24 for the category code, 8 for the buyer type, 8 for keywords. The buyer points are earned on their own, so a tender with no category match and no keyword hit still scores 8 when its buyer type is on the profile's list (4 when the buyer type is unknown). Category points are 0 only when the code, the buyer and the keywords all miss.

The two examples in the Why section therefore have 8 category points, not 0. Under the rule as written (cap when category = 0):

- the recreation centre construction tender stays at 58 Medium and the consulting roadmap at 66 Medium, so the "Done when" line about the recreation centre cannot be met;
- no golden pair changes;
- one eligible fixture tender changes for the sample profile (Courier Services Standing Offer, 57 to 49).

The open question (cap under 10) catches both examples. The tables below show the rule as written and the under-10 variant side by side so the threshold can be decided from the numbers. Three ways to close the gap, with a recommendation:

| Option | Rule | Effect |
| --- | --- | --- |
| A, as written | Cap when category points = 0 | Misses every "wrong category, right buyer" tender. Not enough on its own |
| B, recommended | Cap when category points are under 10 | Catches every no-code, no-keyword tender for every profile in the golden set and the fixtures. Buyer points alone (8) can never lift a tender out of Low. One keyword hit (2 points) still can, see the caveat below |
| C | Cap when no category code matched (the 24-point part is 0) | Same effect as B on today's data, but keyed on the match itself rather than a number, so a future change to the buyer or keyword split cannot move it. Needs the cap to read the category facts, not just the total |

Caveat for B and C: keyword matching is a plain substring test, so "Buildings" matches the software keyword "build" and "capital program" matches "api". That is why Janitorial Services for Municipal Buildings sits at exactly 10 category points and would escape an under-10 cap. Word-boundary matching is a small separate fix I recommend doing in the same pull request; it changes no golden band but removes those stray points. It is listed below as optional.

### 1. Golden pairs that change

Rule as written (category = 0): no pair changes score or band.

Under-10 cap (option B, and option C gives the same result):

| Pair | Category points | Old total | New total | Old band | New band |
| --- | --- | --- | --- | --- | --- |
| sample-construction-far-above-range | 8 | 58 | 49 | Medium | Low |
| sample-consulting-roadmap | 8 | 66 | 49 | Medium | Low |
| small-shop-help-desk-closing-tomorrow | 8 | 53 | 49 | Medium | Low |

sample-quebec-french-only also has 8 category points but is already 39 and ineligible, so it is unchanged. The other 16 pairs keep their score and band under every option. The sample pair stays at 92 with 38, 19, 14, 12 and 9 under every option.

### 2. Fixture tenders with category points under 10 (sample IT profile)

29 of the 55 fixture tenders score under 10 category points for the sample profile. 9 of them are at exactly 0; the other 20 hold 8 buyer points (one holds 2 keyword points). Eligible tenders first, since only they appear in the default list.

| Tender | Buyer type | Region | Category points | Current total | Current band | Eligible | Capped total (= 0 rule) | Capped total (under 10 rule) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FIXTURE-0049 Fleet Logistics and Vehicle Relocation | crown-utility | ON | 8 | 67 | Medium | yes | 67 | 49 Low |
| FIXTURE-0022 Clinical Information System Upgrade | health-authority | ON | 8 | 66 | Medium | yes | 66 | 49 Low |
| FIXTURE-0051 Digital Transformation Roadmap | municipal | ON | 8 | 66 | Medium | yes | 66 | 49 Low |
| FIXTURE-0031 Bridge Rehabilitation Engineering Services | municipal | ON | 8 | 60 | Medium | yes | 60 | 49 Low |
| FIXTURE-0036 Diagnostic Imaging Equipment Supply and Service | health-authority | ON | 8 | 59 | Medium | yes | 59 | 49 Low |
| FIXTURE-0026 Community Recreation Centre Construction | municipal | ON | 8 | 58 | Medium | yes | 58 | 49 Low |
| FIXTURE-0048 Courier Services Standing Offer | federal | CA | 0 | 57 | Medium | yes | 49 Low | 49 Low |
| FIXTURE-0054 Program Evaluation Services Standing Offer | federal | CA | 0 | 47 | Low | yes | 47 | 47 |
| FIXTURE-0005 Management Consulting and Strategic Advisory Services | crown-utility | MB | 8 | 55 | Low (gated) | no | 55 | 49 |
| FIXTURE-0032 Water Treatment Plant Expansion Design | municipal | SK | 8 | 55 | Low (gated) | no | 55 | 49 |
| FIXTURE-0039 Patient Monitoring Systems for Emergency Departments | health-authority | AB | 8 | 55 | Low (gated) | no | 55 | 49 |
| FIXTURE-0045 Hospital Environmental Services | health-authority | NS | 8 | 55 | Low (gated) | no | 55 | 49 |
| FIXTURE-0047 Freight Services to Northern Communities | provincial | NU | 8 | 55 | Low (gated) | no | 55 | 49 |
| FIXTURE-0003 Electronic Health Record (EHR) System Implementation | health-authority | AB | 8 | 54 | Low (gated) | no | 54 | 49 |
| FIXTURE-0046 Warehousing and Distribution of Medical Supplies | provincial | BC | 8 | 53 | Low (gated) | no | 53 | 49 |
| FIXTURE-0027 Fire Hall Renovation and Addition | municipal | AB | 8 | 52 | Low (gated) | no | 52 | 49 |
| FIXTURE-0037 Vaccine Cold Chain Equipment | provincial | QC | 8 | 50 | Low (gated) | no | 50 | 49 |
| FIXTURE-0050 Election Materials Distribution | provincial | PE | 8 | 50 | Low (gated) | no | 50 | 49 |
| FIXTURE-0038 Standing Offer for Pharmaceutical Supply | health-authority | NL | 8 | 48 | Low (gated) | no | 48 | 48 |
| FIXTURE-0028 School Roof Replacement Program | education | MB | 0 | 47 | Low (gated) | no | 47 | 47 |
| FIXTURE-0035 Rail Crossing Safety Improvements | transit | AB | 0 | 47 | Low (gated) | no | 47 | 47 |
| FIXTURE-0040 Dental Equipment for Community Health Centres | indigenous-government | MB | 0 | 47 | Low (gated) | no | 47 | 47 |
| FIXTURE-0042 Grounds Maintenance and Snow Removal | education | AB | 0 | 47 | Low (gated) | no | 47 | 47 |
| FIXTURE-0052 Organizational Review of Public Safety Communications | defence-public-safety | AB | 0 | 47 | Low (gated) | no | 47 | 47 |
| FIXTURE-0033 Highway Resurfacing Program | provincial | NB | 8 | 46 | Low (gated) | no | 46 | 46 |
| FIXTURE-0044 Transit Station Cleaning Services | transit | BC | 0 | 45 | Low (gated) | no | 45 | 45 |
| FIXTURE-0030 Armoury Interior Fit-Up | defence-public-safety | QC | 2 | 44 | Low (gated) | no | 44 | 44 |
| FIXTURE-0055 Transit Fare Policy Review | transit | YT | 0 | 44 | Low (gated) | no | 44 | 44 |
| FIXTURE-0006 Facilities Management and Janitorial Services | provincial | QC | 8 | 39 | Low (gated) | no | 39 | 39 |

Gated tenders are hidden by default, so for the sample profile the visible change is: 7 eligible Medium tenders become Low under the under-10 rule, 1 under the rule as written. After the change, the sample profile's default list would show 6 High (all IT and cybersecurity tenders) and 3 Medium (Custom Software for a federal buyer at 73, Janitorial at 69 and Integrated Facilities Management at 64, the last two only because of the stray keyword hits noted above).

Two eligible tenders sit at exactly 10 and would not be capped under the under-10 rule: FIXTURE-0041 Janitorial Services for Municipal Buildings (69 Medium, keyword "build" from "Buildings") and FIXTURE-0043 Integrated Facilities Management (64 Medium, keyword "help desk", a genuine hit). With word-boundary keyword matching, 0041 drops to 8 and is capped; 0043 keeps its real hit and stays Medium.

### 3. Files to edit

Required for any option:

- `src/lib/scoring/score.ts`: apply the cap after the five factors are summed and before the band; set `MODEL_VERSION` to "rules-2"; add a `CATEGORY_CAP = 49` constant and the threshold constant beside it.
- `src/lib/scoring/types.ts`: add `cap: { code: "categoryCap"; limit: number; uncappedTotal: number } | null` to `ScoreResult`, so the stored factors stay as computed and the screen can explain the capped total.
- `src/lib/scoring/reasons.ts`: when `result.cap` is set, add the reason `{ code: "categoryCap", params: { limit: 49 }, text: "No category match, so this tender is capped at Low." }` at the top of the gaps list, so it becomes the concern line of the summary. (The plan's example code is `category_cap`; the engine's codes are camelCase, so `categoryCap` keeps one convention. Say so if you want the underscore form.)
- `fixtures/golden.json`: update the pairs listed in item 1 (new band, `expectedTotal` 49) and add the proving pairs listed under item 4; bump the `_fixture` note to mention the cap.
- `src/lib/scoring/golden.test.ts`: pair count 20 to 22.
- `docs/development-guide.md`, Scoring engine spec: one sentence after the factor table and before Bands, stating the cap and its threshold, so the guide, the golden set and this plan agree.
- `docs/plans/m2-plan.md` and `CLAUDE.md`: note the cap and modelVersion rules-2 in the scoring sections.

No change needed: `src/lib/scoring/run.ts` already stores `result.total`, `result.band` and the reasons; `prisma/schema.prisma` needs no migration; the worker rescores every row on its next run because the upsert overwrites, and `modelVersion` tells old rows apart.

Only for option C: `src/lib/scoring/score.ts` reads `details.category.facts.codePoints` instead of the total category points. No other file differs.

Optional, recommended in the same pull request: `src/lib/scoring/requirements.ts`, match keyword variants on word boundaries instead of substrings, with two rows added to `requirements.test.ts` ("Buildings" does not hit "build", "capital" does not hit "api"). This moves no golden band.

### 4. Tests to add

In `src/lib/scoring/score.test.ts` (table-driven, using the existing helpers):

- Category 0 with full points elsewhere (60 before the cap): total is exactly 49, band Low, `cap` is set with `uncappedTotal` 60 and the factors are untouched.
- Category 0 with a total already under 49 (for example a far province plus a tight close): total unchanged, `cap` still recorded if we cap by rule, or null if we only record when the cap lowered the total. Recommendation: record the cap whenever the rule applies, since the screen explains why the band is Low either way.
- Category 1 with the same other factors: no cap, `cap` is null. Under option B this row uses category 10; under option C it uses one matched code.
- The sample pair still scores 92 with 38, 19, 14, 12 and 9 (already asserted in `golden.test.ts` and `run.int.test.ts`; add it to `score.test.ts` too so the cap test file carries it).
- `MODEL_VERSION` is "rules-2".

In `src/lib/scoring/reasons.test.ts`:

- A capped result carries the `categoryCap` reason with the exact text, and the summary's second line is that text.
- An uncapped result carries no `categoryCap` reason.

In `fixtures/golden.json` and `golden.test.ts`:

- Rule as written: add sample x FIXTURE-0048 (Courier Services, 57 to 49 Low, proves the cap) and sample x FIXTURE-0054 (Program Evaluation, 47 Low, category 0, proves the cap does not lower a total already under 49).
- Under-10 or option C: add sample x FIXTURE-0049 (Fleet Logistics, 67 to 49 Low) and sample x FIXTURE-0022 (Clinical Information System, 66 to 49 Low); keep sample x FIXTURE-0054 as the under-49 case, which makes 23 pairs. The three pairs in item 1 are updated in place with `expectedTotal` 49 and a note.
- Every capped pair asserts `expectedTotal` 49 and `expectedFactors` as computed, which proves the factors are stored uncapped.

In `src/lib/scoring/run.int.test.ts`:

- Already present: running `scoreAll` twice leaves one row per open tender. Add an assertion that the capped sample x FIXTURE-0026 row has total 49, band Low, factor category 8 (or 0 under option A) and the `categoryCap` reason, and that every row carries `modelVersion` "rules-2".

In `src/lib/scoring/run.test.ts`: `scoreRow` stamps "rules-2".

### Decisions taken (Oct 24, 2026)

1. Threshold B: cap when category points are under 10. `category.test.ts` fails if buyer-type points alone ever reach the threshold.
2. The word-boundary keyword fix shipped first as its own commit, with tests for "Buildings" against "build" and "capital program" against "api". It moved no golden score.
3. Reason code `categoryCap`, text "No category match, so this tender is capped at Low" (no trailing period, matching the other templates). Reworded Oct 26 to "Too little category match, so this tender is capped at Low", since a partial code match can be capped too. The cap is recorded whenever the rule applies, even when the total was already under 49.
4. The test-only reader for the sample file is built (`src/lib/scoring/canadabuys-sample.ts`); the CanadaBuys golden batch waits for the M4 parser.

### Decisions taken (Oct 26, 2026, after the code review)

1. The cap threshold reads code plus keyword points only. Buyer-type points (8 for a right buyer) plus one generic keyword (2) reached 10 and let a municipal janitorial tender show Medium to a municipal IT firm. `categoryMatchPoints()` in `score.ts` is the measured value and `result.cap.matchPoints` records it. Still rules-2: nothing is deployed. No existing golden pair moved (every capped pair already had 0 code and keyword points; every uncapped pair had 24 code points). On the seeded database two rows move: FIXTURE-0043 Integrated Facilities Management for the sample profile, 64 Medium to 49 Low (buyer match plus "help desk"), now golden pair `sample-facilities-help-desk-capped`; and FIXTURE-0040 Dental Equipment for the Manitoba logistics profile, 69 to 49 (buyer match plus "delivery"), not in the golden set. The `category.test.ts` guard on buyer points stays as belt and braces.
2. The summary is stored as reason objects (`{ code, params, text }[]`), the same objects as the three lists, so the list row renders in French from the stored row. Schema comment updated; no migration, the column is JSON.
3. Five fixes as separate commits: a set-aside must name a kind of supplier (funding, time and rooms are no longer set-asides, and the extractor scans every clause); bare "reference" ("Terms of Reference", "reference number", "for reference") no longer docks experience points; the French P.Eng. pattern needs the licence ("ingenieur agree", "Ordre des ingenieurs"), not the word for an engineer; score-all and score-profile log a failure with the job id and report it to Sentry before rethrowing; the after-hours capacity lookup is a Map and `clampPoints` turns a non-finite value into 0.
4. Conditional and partial set-asides (rows 3 and 20): scoped below, not small, not in this pull request.
5. The three deferred review items are recorded below as M4 follow-ups.

### Conditional and partial set-asides: scope (Oct 26, 2026)

What the two sample rows say, after normalization:

- Row 3, Open Construction Source List for CFB Halifax: "tenders may be set aside for indigenous businesses in accordance with the procurement strategy for indigenous business (psib). in such cases ... the merx advertisement will clearly state that the opportunity is reserved for indigenous businesses under psib ... if you are forming a joint venture (jv) to bid on a contract set aside for indigenous businesses, at least one member ...". Three phrases: one with "may be", two inside conditional sentences ("in such cases", "if you are forming").
- Row 20, Hazardous Waste Disposal Services: two supply streams, a general one open to "any supplier, including indigenous suppliers", and a PSAB one; "for requirements estimated between $40,000.00 to $100,000.00 ... will be subject to the set aside under the federal government procurement strategy for aboriginal business (psab)". Firm language, for one value band of one stream.

Why there is no small fix: ignoring "may be set aside" releases neither row. Row 3 still carries two firm-looking phrases in conditional sentences, and row 20's tier clause is firm. The only safe reading needs to know whether the profile can claim the set-aside, which the profile cannot say yet, and a softer reading of conditional clauses so the notice is shown with a warning instead of hidden.

The fix, about one day across two milestones:

1. Profile (M3, with the questionnaire): `indigenousBusiness Boolean @default(false)` on companyProfile, one question in the credentials step ("Is your business Indigenous-owned and listed in the Indigenous Business Directory?"), Zod schema, migration, `ScoringProfile.indigenousBusiness`. About 2 to 3 hours.
2. Extractor (M4, same pull request as the notice-type gate): `setAside` becomes `{ group, kind: "indigenous" | "other", firm: boolean } | null`. `kind` is "indigenous" when the group contains indigenous, aboriginal, autochtone, PSIB or PSAB. `firm` is false when every matching clause is governed by "may be", "might be", "could be", "in such cases", "if ..." or a value-band clause ("for requirements estimated between $X and $Y", "below $X"). About 2 hours with tests on rows 3 and 20 and crafted text.
3. Gate and reasons: gate only when `firm` and the profile cannot claim the group (kind other, or kind indigenous and `indigenousBusiness` false). A non-firm set-aside goes to "could rule you out" as `setAsideConditional`, "May be set aside for {group}", without gating. An Indigenous profile on an Indigenous set-aside gets an in-favour reason instead. About 2 hours with tests.
4. Golden set: the Manitoba logistics profile (Indigenous-owned in its description) against `national-consultancy-set-aside`'s tender becomes eligible once it claims the flag; `national-consultancy-set-aside` stays gated; rows 3 and 20 join the CanadaBuys batch as "shown with a warning". Docs: guide gate paragraph, this plan. About 1 hour.

Small and medium business set-asides (decided Oct 26, 2026): they never gate. The extractor drops a group that reads as small or medium business or enterprise, in English or French, because those are the suppliers the product serves. A softer "could rule you out" line for large firms, once the profile can say how large the company is, belongs to this conditional set-aside work, not to the gate.

No backfill is needed: the next score-all rewrites every row.

### M4 follow-ups from the Oct 26 code review

| Item | What the review found | Fix and when |
| --- | --- | --- |
| `scoreAll` memory | `run.ts` builds every profile and tender row in memory before writing, and calls `extractRequirements` once per pair rather than once per tender. With 900 open notices that is 900 rows per profile, fine for tens of profiles, a memory risk in the hundreds on an 8 GB shared server | Extract once per tender, then score and flush per profile (batch upserts inside the profile loop). Do it in M4 with the adapter, when real volumes exist, and measure the nightly run |
| score-all and score-profile overlap | Both jobs upsert the same (tenderId, profileId) rows in transactions. A profile job running during the nightly score-all can deadlock on the unique index, which Postgres resolves by aborting one transaction; pg-boss then retries it | Order the rows in every batch by tenderId then profileId so both jobs take locks in the same order, or have score-profile defer while a score-all job is active. Decide in M4 when the import chains score-all |
| Duplicated day arithmetic | `DAY_MS` and the day offset helper live in `src/lib/seed/fixtures.ts`, `factors/timeline.ts`, `test-helpers.ts` and `golden.ts` | One `src/lib/dates.ts` with `DAY_MS`, `daysFrom` and `daysUntil`; a chore commit at any time, no behaviour change |

### Decisions taken (Oct 27, 2026, third code review)

1. The integration tests upsert the fixtures and never delete the fixtures source row, which cascaded to every fixture tender and score.
2. The timeline reason compares days, not rounded points.
3. docs/development-guide.md carries one category cap paragraph.
4. Four extractor over-matches fixed with tests: "reserved for" needs a procurement subject in the clause, bilingual needs a requirement verb or a service noun, "24 hour" counts only as coverage, ISO/IEC 27001 is recognized.
5. Reason params store codes, not English labels; the UI labels them in the viewer's language. `certificationMissing` carries the list of codes.
6. The cap rule for coded tenders does not change. The finding (a tender carrying any code the profile does not list can never clear the cap on keywords alone, while the same text with no code can) is answered by the M4 acceptance check below, not by a rules change now.
7. M2 review rounds stop here. Any remaining finding goes to this plan as a follow-up unless it is data loss, wrong gating or High severity.

### M4 acceptance check: coded tenders and the cap (added Oct 27, 2026)

Before the M4 import is called done, with the adapter and the real file:

1. Score the full CanadaBuys open file (the Oct 24 profile: 897 notices) for the sample IT profile.
2. Review every notice whose UNSPSC starts with 43 or 81 (99 in that file) and list any good match that the cap wrongly holds at Low. The expected cause is a code the profile does not list on a notice whose text matches well.
3. Sample the capped notices across the rest of the file and confirm they are work the sample company does not do.
4. Map profile categories to UNSPSC by code prefix (segment or family, the first two or four digits), not by exact code, in the adapter's normalization table, so a coarse or sibling code still earns code points. Rerun steps 1 to 3 after the mapping.

The check passes when no 43 or 81 notice that reads as managed IT, cybersecurity or custom software is capped, and the sampled capped notices are all outside the profile's categories. A failure reopens the cap rule for coded tenders (letting keyword points count fully when no code matches is the candidate change, with a golden recheck), not before.

### Follow-ups from the Oct 27 code review (recorded under the stop rule)

The one wrong-gating finding was fixed in this pull request: "limited to pre-qualified suppliers" and "reserved for suppliers holding a supply arrangement" no longer count as set-asides, because a qualification status is not a kind of supplier. The rest wait, as decided.

| Item | What the review found | Fix and when |
| --- | --- | --- |
| `score-profile` payload | The job data is not parsed; a missing `profileId` turns the job into a full rescore of every profile under a singleton key sized for one | Zod schema for both job shapes in `src/lib/queues.ts`, parsed in the handler and in `enqueueScoreProfile`. M3, when `PUT /api/profile` enqueues the job |
| Duplicate category codes | `codePoints` is a ratio of two un-deduplicated arrays; two UNSPSC codes mapping to one category would halve the share and could push a true match under the cap | Dedupe both lists with a Set in `factors/category.ts`. M4, with the prefix mapping, since that is where duplicates arise |
| `scoreAll` memory and repeated extraction | Already listed above (M4 follow-ups) | Unchanged |
| Bare "on call" | "based on call volumes" counts as after-hours coverage and docks capacity points | Require a coverage noun ("on call support", "on call rotation") or keep the hyphen through normalization. Points only, M4 extractor pass |
| Bare "bilingual" | "the notice is bilingual" counts as bilingual delivery and costs two language points | Same delivery or service context as the other bilingual branches. Points only, M4 extractor pass |
| `createQueue` options | pg-boss `createQueue` is a no-op once the queue exists, so later changes to expiry or retries never reach a deployed database | Call `updateQueue` after `createQueue`, or create only when `getQueue` is null. M4, before the first deploy of the worker |
| `referenceCount` context | The count regex runs over raw text and can take its number from an unrelated sentence ("Section 2 references the annex") | Run it over `normalizeText` and anchor it to the client or project context. Cosmetic, M4 extractor pass |
| Day arithmetic | Already listed above (M4 follow-ups) | Unchanged |
| `fixtures.int.test.ts` count | Without the clean-slate delete, a renamed fixture id would leave a stale row and fail the count on a reused database | Compare the stored externalId set to the fixture set, or delete fixture tenders not in the file while keeping the source row. Test only, with the next fixture change |

### Decision needed before code (resolved above, kept for the record)

1. Threshold: A (= 0, as decided, does not fix the recreation centre), B (under 10, recommended) or C (no category code matched).
2. Whether to include the word-boundary keyword fix in the same pull request.
3. Reason code spelling: `categoryCap` (engine convention) or `category_cap` (as written in this plan).

## Real data readiness

Oct 24, 2026. The M2 engine checked against "What the CanadaBuys file actually contains" in docs/development-guide.md. Each row says what the code does today, what would happen on the real file, and where the fix belongs (the M4 adapter, the scoring engine, or the schema). Findings marked "verified" were reproduced by running the engine on a crafted input; the rest are read from the code.

The short version: the engine is fine on data that has already been normalized into the tender shape, but the tender shape and the extractor both assume clean fixture-style input. Most fixes belong in the CanadaBuys adapter, with four small defensive changes in scoring and two schema decisions that should be made before M4.

| Area | What the code does today | On real CanadaBuys data | Fix and where |
| --- | --- | --- | --- |
| Missing contract value (89% of notices) | `factors/size.ts` gives 6 fit + 1 certainty = 7 of 15 when both values are null, and `reasons.ts` adds "No value is published" (verified) | Works, but almost every tender gets the same 7, so size stops separating tenders, and nearly every listing carries the "No value is published" line. The 11% of descriptions that state a dollar amount still score as unknown because nothing reads amounts from text (verified: "Estimated value $1,200,000" scores 7, position unknownValue) | Scoring, later: a small money extractor in `requirements.ts` ($1,200,000, $1.2M, 1 200 000 $) feeding `valueMin`/`valueMax` when the columns are empty. Reasons: drop the "No value is published" gap or move it to the facts panel, since it will be true for 9 in 10 listings |
| Missing category codes (11% have neither UNSPSC nor GSIN) | With an empty `categoryCodes`, `factors/category.ts` scores the 24 code points from the keyword share of the best profile category (verified: a no-code IT notice with five keyword hits earns 24 + 8 = 32 before buyer points) | Works as the guide asks: codeless tenders can still earn category points from title and description words, and will not be wrongly capped unless the text has no keywords at all. The cost is that keyword lists are short (five per category) and English-only, so codeless French notices score 0 category points and would be capped | Scoring: feed the English description to the extractor (the file has both languages as separate columns). Adapter: map UNSPSC and GSIN to the ten internal codes before validation, see the next row |
| Category code format (leading asterisk, several codes on separate lines, UNSPSC or GSIN) | `tenderInputSchema` validates `categoryCodes` against the ten internal codes. A raw UNSPSC string fails validation, and a failed parse drops the whole notice | Scoring never sees raw codes, which is right, but without a mapping table every notice either arrives with an empty array (and scores on keywords only) or is dropped. `codePoints` is the share of the tender's codes the profile lists, so a notice carrying four UNSPSC codes that map to one internal code must be deduplicated to one, not four, or a perfect match scores 6 of 24 | Adapter (M4): strip the asterisk, split on new lines, map UNSPSC segments 43 and 81 and the others to internal codes, deduplicate, and record unmapped codes on the ingestRun so the mapping table can grow. Keep the schema strict |
| Region and province variants (Canada, World, National Capital Region, cities, "(except NCR)", Quebec / Québec / QC / ONTARIO) | `region` is one string validated against CA plus 13 province codes; "Ottawa", "Quebec", "World" and "Canada (except NCR)" all fail the schema (verified). If an unknown value slipped past, `gate.ts` would mark the tender ineligible for every profile (verified with "Ottawa") | Without a normalization table, 87% of notices fail validation on delivery region alone. The gate is the harshest rule in the engine, so a mapping mistake hides a tender from everyone. Multi-province notices have nowhere to go: `region` holds one value, so "Ontario, Quebec" must become CA or one province, and the losing province's firms are gated | Adapter: one normalization table (province names in both languages, codes, upper case, cities to their province, Canada / World / NCR / "(except NCR)" to CA). Schema decision before M4: either `region String[]` with `regionMatches` checking any overlap, or keep one value and map any multi-province notice to CA. I recommend the array; the gate and the list filter both read it easily |
| Asterisks | Only relevant to the code columns above; title and description asterisks are harmless to the regexes | No scoring effect | Adapter |
| Multi-value fields (codes, regions, two languages, attachments) | Codes are already an array. Region is a single value (above). `language` is one of EN, FR, EN_FR, and `factors/location.ts` gives an English-only profile 3 of 5 points plus a "Bilingual delivery is required" gap whenever the tender is EN_FR | Every CanadaBuys notice is published in both languages. If the adapter marks them all EN_FR, every English-only profile loses 2 language points on every tender and sees "Bilingual delivery is required" everywhere, which is false: a bilingual notice is not a bilingual delivery requirement | Adapter: set `language` to the language of the text stored (EN), and let `bilingualRequired` from the description text decide the partial credit, as the extractor already does. Scoring: no change once that rule holds |
| HTML entities and tags (12% of descriptions) | `normalizeText` lower-cases, strips accents and turns hyphens into spaces. It neither decodes entities nor strips tags | Verified misses: "Help&amp;nbsp;desk" does not match "help desk", "24&amp;#47;7" does not match after-hours, "SOC&amp;nbsp;2" does not match the certification. Tags mostly survive because they end in a non-word character, but `&amp;nbsp;` glues words together and the keyword and certification points are lost | Adapter (the guide already says so): decode entities and strip tags before storing. Scoring, cheap insurance for other sources: decode the common entities and strip `<...>` inside `normalizeText`, with two rows in `requirements.test.ts`. I recommend doing both |
| Non-bid notice types (98 clearly not bids, 110 with no type) | The tender table and `ScoringTender` have no notice type. `run.ts` scores every open tender; `listOpportunities` shows every eligible one | Requests for information and advance contract award notices would be scored and listed as opportunities, some as High. The gate cannot catch them, and the text patterns do not look for "request for information" | Schema decision before M4: add `noticeType` to tender (keep the raw value plus a normalized enum: bid, rfi, acan, directed, other, unknown). Adapter fills it. Scoring: skip non-bid types in `run.ts` or score them and set a `notBid` blocker in `gate.ts` so they save but stay hidden, which keeps the "why hidden" note. The list hides them by default |
| Past closing dates (121 notices still marked Open) | `run.ts` only loads tenders with `closesAt > now`, and `listOpportunities` filters the same way. If a closed tender were scored anyway, `factors/timeline.ts` gives 0 time points but still 5 capacity points (verified: a notice closed three weeks ago scores timeline 5, band Low) | Correct by construction: closed notices are neither scored nor shown, whatever the Status column says. The reason text would be odd for a closed tender ("Closes in 0 days, under your 10 day lead time") but it is never reached | Nothing to change. Adapter: still store them, since amendments can reopen a notice |
| Far future closing dates (41 notices in 2031 or later, some 2100) | `daysUntil` returns the real count and the timeline factor gives full points. The reason reads "Closes in 26733 days, inside your lead time" (verified) | Standing arrangements score full timeline points, which is defensible, but the reason text is nonsense and the list sorted by closing date puts them last, which is fine | Scoring: treat anything more than 365 days out as ongoing: same points, reason "Ongoing: no fixed closing date" and `daysLeft` capped in the facts. One row in `timeline.test.ts` and one in `reasons.test.ts` |
| Closing time with no time zone (2026-11-13T14:00:00) | `closesAt` is whatever Date the adapter produces. `daysUntil` rounds to whole days, so a 4 or 5 hour offset rarely changes the points | The `closesAt > now` filter is exact, so a notice closing at 14:00 Eastern parsed as 14:00 UTC disappears 4 or 5 hours early, or stays 4 or 5 hours late if parsed the other way. On the closing day the day count can flip between 0 and 1 | Adapter: confirm the zone in the data dictionary and parse with it (America/Toronto is the likely answer). Scoring: no change |
| Buyer concentration (PSPC 391, DND 128, 76 buyers) | `buyerType` must be one of nine internal codes or null; null gives 4 of 8 buyer points and no reason line | Without a buyer mapping every notice is "unknown" and buyer points stop meaning anything. With a naive mapping, PSPC buys on behalf of other departments, so "federal" is right for 58% of the file and the sample IT profile (municipal, provincial, health, crown) would lose the buyer points on most of it, which is honest | Adapter: map the entity name to a buyer type (PSPC, DND, and the rest to federal; crown corporations to crown-utility). Product: the sample profile's buyer list has no federal, so expect lower scores on CanadaBuys than on the fixtures until the questionnaire nudges users to tick it |
| Links incomplete (45% have a notice link, all off-site) | Not a scoring concern; `officialUrl` is required by the schema | A missing link fails validation and drops the notice | Adapter: fall back to the CanadaBuys tender page built from the reference number, never drop a notice for a missing link |

### What to do, in order

1. Before M4 code, two schema decisions: `region` as an array (or a documented single-value rule) and a `noticeType` column. Both are small migrations now and painful after launch.
2. In the M4 adapter: the normalization tables (province and region, UNSPSC and GSIN to internal codes, entity to buyer type), entity decoding and tag stripping, English text into `description`, `language` EN, closing time zone, and a fallback official link. Log every unmapped value on the ingestRun.
3. In scoring, four small changes that can ride with the category cap pull request: decode entities and strip tags in `normalizeText`; "ongoing" handling for closing dates more than a year out; skip or gate non-bid notice types once the column exists; stop emitting "No value is published" as a gap.
4. Later, when real rows exist: a money extractor for the 11% of descriptions that state an amount, and French keyword variants so French-only notices are not starved of category points.

None of this changes the sample pair or the golden set. The golden set should gain a CanadaBuys-shaped batch once the trimmed sample CSV lands in fixtures/: codeless notice with keywords, bilingual notice, 2100 closing date, HTML in the description, and a request for information.

### Sample file: fixtures/canadabuys-sample-20.csv

Added Oct 24, 2026: 20 rows, 67 columns, 157 KB, the trimmed copy the guide asks for. It is the M4 parser test file and the scoring tests reuse it. What the 20 rows exercise, against the table above:

| Finding | Rows that carry it |
| --- | --- |
| Codes with a leading asterisk | Every code column (`*81111500`, `*D304A`, `*SRV`) |
| Several codes on separate lines | Row 8 (two UNSPSC codes), rows 16 and 17 (procurement category `*GD` and `*SRV`) |
| No UNSPSC and no GSIN | Rows 3, 6, 9, 14, 15, 16, 17, 18 (all MERX-sourced) |
| GSIN only | Rows 7, 11, 12, 13, 20 |
| Region variants | `National Capital Region (NCR)` (row 1), `World` opportunity with `British Columbia` delivery (row 5), `Ontario (except NCR)` (row 10), a city, `Wainwright` (row 19), 14 regions on separate lines including `Nunavut Territory` and `Quebec (except NCR)` (row 20), and 10 rows with both region columns empty |
| Entity province variants | `Ontario`, `ON`, `MB`, `AB`, `Quebec`, `Nova Scotia`, `Alberta` |
| Non-bid notice types | Row 12 Request for Information, row 13 Advance Contract Award Notice, 8 rows with an empty notice type (all MERX) |
| Past closing dates while Open | Rows 14 (Nov 2025), 15 (May 2026), 20 (Sep 2026) |
| Far future closing dates | Rows 3 (2029), 10 (2028), 7 and 11 (2065), 16 (2074) |
| Closing time without a zone | Every row, e.g. `2026-10-26T14:00:00` |
| Empty publication date | Row 13 |
| HTML in the description | Rows 3, 6, 7, 9, 11, 12, 13, 14, 17, 18 |
| Dollar amounts only in the text | Row 3 ($10 million), row 6 ($4,000,000.00 to $6,000,000.00), row 18 ($240M), row 20 ($40,000.00) |
| English and French descriptions in separate columns | Every row; rows 14, 15 and 16 have the same text in both |
| Notice link missing or off-site | 11 rows empty, 8 MERX links, 1 Ariba link |
| IT-shaped notices for the sample profile | Rows 1 (technology architect, 81111500), 2 (video encoders, 43211608), 7 and 11 (internet access), 12 (desktop virtualization), 17 (managed services platform) |
| Amendment number above 000 | Rows 10 and 12 |

Two notes on the file itself:

- Done on purpose (Oct 24, 2026): the contracting officer's contact details were blanked before the file was committed. Six columns are empty in every row: `contactInfoName-informationsContactNom`, `contactInfoEmail-informationsContactCourriel`, `contactInfoPhone-contactInfoTelephone`, `contactInfoFax`, and the English and French `contactInfoAddressLine` columns (79 values removed, every other cell unchanged, verified by re-parsing). The city, province, postal code and country columns stay because they describe an office, not a person. The data is public under the Open Government Licence, but the parser never stores contact details, so the fixture does not need them, and the sample reader test asserts they stay blank.
- The header names are the bilingual CanadaBuys originals (`title-titre-eng`, `tenderClosingDate-appelOffresDateCloture`). The adapter should reference them from one column map so a renamed header fails loudly in the parser test instead of silently producing empty fields.

Found while building the reader test (Oct 24, 2026):

- Conditional and partial set-asides. Row 3 says tenders under the source list "may be set aside for Indigenous businesses" and row 20 applies the PSAB set-aside to one value band of a standing offer. The extractor reports both as set-asides and the phase 1 gate then blocks the whole notice for every profile, since it cannot tell a conditional clause from a firm one and the profile has no field to claim Indigenous business status. Conservative, but on the real file this hides notices that most firms can bid on. Scoped Oct 26, 2026 under "Conditional and partial set-asides: scope" above: an Indigenous business flag on the profile (M3) and a softer reading of conditional clauses that lands under "could rule you out" instead of the gate (M4).
- "Set aside from the international trade agreements" is an exemption, not a group set-aside. The pattern now ignores "set aside from", with a test row; before the fix a notice carrying only that boilerplate would have been gated for everyone.
- Only 8 of the 20 rows have an empty notice type, not 10 as first written above (corrected).

How scoring reuses it, in two steps:

1. Now, without the adapter: a test-only reader (`csv-parse`, title and English description only) feeding `extractRequirements` and `normalizeText`, so the extractor is tested on real text: entities and tags in rows 3, 6 and 18, the 24/7 and references patterns, the dollar amounts once the money extractor exists, and the French-only rows. No mapping is needed for that because the extractor reads text only.
2. After the M4 parser: a `canadabuys-golden.json` batch that names rows by reference number and runs them through the adapter and then `scoreTender` against the sample profile, with expected eligibility, band and the cap. Expected outcomes to pin: rows 12 and 13 hidden as non-bid; rows 14, 15 and 20 excluded as closed; rows 7, 11 and 16 scored as ongoing; row 20 reaching an Ontario profile through its 14-region list; row 19 mapped from Wainwright to Alberta and gated for the sample profile; rows 1, 2 and 17 earning category points for the sample IT profile with and without UNSPSC codes.
