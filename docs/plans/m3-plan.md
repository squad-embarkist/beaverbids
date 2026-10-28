# M3 Core screens: build plan

Oct 27, 2026, re-checked Oct 28 against `development` after the landing page merge · Status: proposed, waiting for approval

Milestone M3 from docs/development-guide.md, scoped as requested: four screens on fixture data (sign in and create account, the five-step questionnaire, the opportunities list, the listing detail), built with shadcn/ui and Tailwind from the tokens in docs/ui-ux-guide.md and the lo-fi wireframes in docs/wireframes/. Plus the pieces those screens need underneath: the score keyset in `GET /api/opportunities`, `GET` and `PUT /api/profile` validated with Zod, the security clearance question and the Indigenous-business flag on the profile, reasons rendered from next-intl messages keyed by reason code, and the official notice link with a fallback.

Done when a Playwright test signs up, completes the questionnaire, lands on the scored list and opens a scored listing, and the accessibility checklist in the UI guide passes on all four screens.

Not built: instant score, saved and hidden tabs, the email digest, the proposal writer, the pipeline board, French copy, the language switcher.

## What the wireframes fix, and what M3 drops from them

| Wireframe element | In M3 | Note |
| --- | --- | --- |
| Five steps with the numbered rail, "STEP 02 OF 05", why-we-ask panel with the five weights, answers-so-far panel, Back, Skip, Continue, Save and finish later | Yes | Skip is only on steps whose fields are all optional (basics is required for the name; work and regions need one choice) |
| "We filled in some answers from your website" banner, Use another site, Add a category | No | Website pre-fill is part of the instant score (later phase); categories are a fixed list of ten |
| EN / FR switch | No | English only in the MVP |
| List: score, title, buyer and region, closing, value, one reason line, sort, search, category and province filters, closing within | Yes | The "Not a fit" and "Save" buttons, the Saved and Hidden tabs, the portal filter and the minimum score slider are later; a band filter (High, Medium, Low chips) stands in for the slider |
| List: "Scoring you against" panel with "Edit my answers", "Make scores sharper" | Panel yes, sharper no | The panel reads the profile; the progress widget needs save and past projects |
| Detail: title, buyer, value, posted, closes box with days left, Open on portal, score panel with five bars, fit assessment in three lists, "Update them" link to the questionnaire | Yes | The plain-language summary, About the buyer, Scope in brief, Documents and Raise this score need AI or data the tender does not carry; the detail shows the notice description instead |
| Mobile: score left, title and closing right, bottom nav | Yes | Two nav items (Opportunities, My answers) fit at 375 px, so the top bar needs no menu component |

## Routes and navigation

| Route | Purpose |
| --- | --- |
| `/sign-in`, `/create-account` | Built in M0. Create account now redirects to `/questionnaire/basics`; sign in redirects to `/opportunities`, or to the first unfinished step when `questionnaireStep` is under 5 |
| `/questionnaire/[step]` | `basics`, `work`, `regions`, `size`, `credentials` from `QUESTIONNAIRE_STEPS`. Unknown step is 404. Serves both onboarding and "My answers" |
| `/opportunities` | The scored list. Replaces `/dashboard`, which becomes a permanent redirect in `next.config.ts` |
| `/opportunities/[id]` | Listing detail |
| `GET /api/profile` | The signed-in user's profile, or 404 `NOT_FOUND` |
| `PUT /api/profile` | Save one questionnaire step; queues `score-profile` |
| `GET /api/opportunities` | Existing, gains the score keyset |
| `GET /api/opportunities/[id]` | Listing detail as JSON, same shape the page uses |

`src/proxy.ts` extends the cookie check to `/questionnaire/:path*` and `/opportunities/:path*`. Every page still verifies the real session with `getCurrentUser()` behind Suspense, as Cache Components requires. The top bar gets two links (Opportunities, My answers) with the red active item, the user's email and Sign out.

A signed-in user with no profile who opens `/opportunities` is sent to `/questionnaire/basics`. A user who finished the questionnaire can edit any step from "My answers"; the step pages read the saved profile, so a refresh never loses an answer.

## Profile changes

**Schema** (one migration, `m3_profile_credentials_and_notice_link`):

- `CompanyProfile.securityClearance String?` validated against a new vocab list `CLEARANCE_LEVELS = ["reliability", "secret", "top-secret"]`; null means none.
- `CompanyProfile.indigenousBusiness Boolean @default(false)`, the flag from docs/plans/m2-category-cap.md step 1. M3 stores it and passes it to `ScoringProfile`; the gate and the conditional set-aside reading use it in M4 as that plan says.
- `Tender.officialUrl String?`, nullable, so the M4 adapter can store a blank notice link honestly instead of inventing one. `tenderInputSchema` allows null; the fixtures all keep their links.

**Zod** (`src/lib/schemas/company-profile.ts`): the credentials step grows `securityClearance: clearanceLevel.nullish()` and `indigenousBusiness: z.boolean().default(false)`. New `profileStepSaveSchema`, a discriminated union on `step` with the matching step schema as `answers`, is the body of `PUT /api/profile`. The step schemas are the resolvers for the five forms, so the form and the route check the same rules.

**Scoring** (`src/lib/scoring`): `ScoringProfile` gains `securityClearance?` and `indigenousBusiness?`. The clearance check in `factors/location.ts` is satisfied when the profile holds any clearance (the extractor only detects that one is required, not which level). Reasons: `clearanceRequired` stays for a profile without one; a new code `clearanceHeld` goes under "in your favour" when the profile has one. `MODEL_VERSION` becomes `rules-3` with a comment line. No golden pair changes band: no golden profile holds a clearance. One pair is added, the national consultancy with `securityClearance: "reliability"` against the Secret clearance tender, expected High and eligible, so the new rule is pinned. `scoreAll` selects the two new columns.

## PUT /api/profile and the rescore job

Body: `{ step, answers }` parsed with `profileStepSaveSchema`; 400 `BAD_REQUEST` with the failing paths otherwise. The handler upserts the profile for the session user: step `basics` creates the row when none exists; any other step on a missing profile returns 409 `CONFLICT` with code `PROFILE_MISSING` (the questionnaire always starts at basics, so this only guards direct API calls). `questionnaireStep` becomes `max(current, index of step + 1)`. Response is the saved profile.

After the save the handler calls `enqueueScoreProfile(boss, profile.id, "profileUpdated")` with the id from the database row, never from the request. The web app gets its own pg-boss sender in `src/lib/boss.ts` (one instance per process, like `db.ts`, started with supervision and scheduling off and `migrate: false` so only the worker migrates; exact options checked against the pg-boss 12 docs when built). A send failure (worker never ran, queue missing) is logged and reported to Sentry, and the save still returns 200: the nightly `score-all` catches up, and the list shows "Your scores are on their way" meanwhile.

**The guard the brief asks for.** `src/lib/queues.ts` gains `scoreAllJobSchema` and `scoreProfileJobSchema` (Zod). `enqueueScoreProfile` parses before sending, and the worker's `score-profile` handler parses `job.data` before calling `scoreAll`: a job without a `profileId` fails and is retried, and never falls through to a full rescore. Unit tests cover both sides.

The step forms call `PUT /api/profile` with `fetch` from the client, so the route is the one write path and its schema is the one validation. No server action for the questionnaire.

## Questionnaire

Files under `src/components/questionnaire/`: `store.ts` (Zustand), `step-form.tsx` (shared frame: rail, counter, heading, value line, Back, Skip, Continue, Save and finish later), one form per step, `option-card.tsx` (checkbox and radio cards), `why-we-ask.tsx`, `answers-so-far.tsx`. Page at `src/app/questionnaire/[step]/page.tsx` reads the profile behind Suspense and hands it to a client component that hydrates the store.

Store: `answers` for the five steps, `completedStep`, `hydrate(profile)`, `setStep(step, answers)`. No persistence middleware: the server is the source of truth because every step saves, and the store exists so the step pages share one in-memory copy and the answers-so-far panel updates without refetching.

Forms: React Hook Form with `zodResolver` from `@hookform/resolvers/zod` on the step schema. base-ui inputs (Checkbox, RadioGroup, Select) are controlled, so they go through `Controller`. On submit: validate, `PUT /api/profile`, `setStep`, `router.push` to the next step, or to `/opportunities` after credentials. Save and finish later submits the current step the same way and goes to `/opportunities`. Server errors show as a form-level alert from `Questionnaire.errors`.

| Step | Fields | Control |
| --- | --- | --- |
| 1 basics | name, website, headOfficeProvince, capacity | Input, Input, Select, radio cards for the six bands |
| 2 work | categories (1 to 10), buyerTypes, description, languages | Checkbox cards, checkboxes, Textarea, radio cards |
| 3 regions | regions (1 or more) | Checkbox cards, "All of Canada" first |
| 4 size | sizeMin, sizeMax, timelinePref | Two Inputs with a $ prefix and `inputMode="numeric"`, one Input for days |
| 5 credentials | certifications, bonding, securityClearance, indigenousBusiness | Checkboxes for SOC 2, ISO 27001, ISO 9001, P.Eng., Health Canada licence plus a free-text "Other" line; Yes/No radios for bonding; radio cards None, Reliability, Secret, Top Secret; a Yes/No radio for "Is your business Indigenous-owned and listed in the Indigenous Business Directory?" |

The certification checkboxes store the same strings the extractor recognises (`certificationCodesFor` in `requirements.ts`), so a ticked box scores. The free-text line keeps anything else.

Each step shows one H1, the mono "STEP 2 OF 5" counter with `aria-current="step"` on the rail, the progress announced through a visually hidden live region, visible labels on every field, errors tied by `aria-describedby`, and a 44 px primary button that sits at the bottom on phones.

shadcn additions: `radio-group` and `textarea` through `npx shadcn add`, restyled to the tokens (44 px tall, square corners from the radius tokens, 2 px asphalt focus border).

## Opportunities list

Server component page. The static shell holds the top bar and heading; the filters and rows stream in behind Suspense, reading `searchParams` and calling `listOpportunities` directly (no fetch to our own API from the server).

Filters are a plain `GET` form so they work without JavaScript and with the keyboard: search (title and buyer), category select, province select, sort (Best score, Closing soonest), and three band chips (High, Medium, Low) as links that toggle `band`. State lives in the URL, which is what the existing query schema already parses. Paging is a "Show more" link carrying `cursor`. Default sort is score, as the guide requires.

Row content in this order: score chip, title (link to the detail), buyer, region, closing date as "Oct 23, 2026" plus "closes in 9 days", value ("$1.2M", a range, or "Value not stated"), and the first summary reason. On 768 px and up it is a table with 56 px rows and `scope="col"` headers; under that it is a stack of cards with the score on the left. The whole row is reachable by keyboard through the title link; the row click is a progressive enhancement on top of that link.

Score chip component (`src/components/score/score-chip.tsx`): number in expanded Archivo with "/100" in mono, the band word beside it, the band colour as the chip border and the little bar. A row with no score row yet shows a "Scoring" chip with no number. Ineligible rows are hidden by default (unchanged); a "Show ineligible" link sets `includeIneligible`, and those rows show "Not eligible" with the first rule-out reason instead of a number.

Right-hand panel "Scoring you against" lists categories, buyers, size, regions and language from the profile with an "Edit my answers" button, under the list on phones.

Empty states: no profile, redirect to the questionnaire; profile but no score rows, "Your scores are on their way. Tenders are scored within a few minutes of saving your answers"; filters that match nothing, "No tenders match these filters" with a "Clear filters" link. Loading is skeleton rows that match the table.

## Score cursor

`sort=score` today orders by closing date. The brief asks for the score keyset first, and it is the one query change with any subtlety, so it is spelled out.

Prisma cannot order tenders by a related score row filtered to one profile, so the list runs in two phases when `sort=score` and the user has a profile:

1. **Scored.** Query the `score` table for the profile, ordered by `total desc, tender.closesAt asc, tenderId asc`, with the tender filters applied through the `tender` relation and `eligible` honoured as today. Cursor: `{ phase: "scored", total, closesAt, id }`, keyset `total < t OR (total = t AND closesAt > c) OR (total = t AND closesAt = c AND id > i)`.
2. **Unscored.** When a page from phase 1 comes up short, fill from tenders with no score row for this profile, ordered by closing date as today, with the existing cursor shape plus `phase: "unscored"`.

Every open tender appears exactly once; scored rows always come before unscored ones; a `band` filter skips phase 2 because unscored rows have no band. Without a profile, `sort=score` behaves like `sort=closing`. `sort=closing` is unchanged. The cursor schema becomes a discriminated union and `decodeCursor` keeps returning null on anything else.

Tests: cursor round trip for both shapes; the where and order builders with a mocked client; an integration test that seeds the fixtures and the dev profile, runs `scoreAll`, pages `sort=score` with limit 10, and asserts totals never increase, every tender appears once, and the sample tender is first at 92.

## Listing detail

`src/app/opportunities/[id]/page.tsx` reads `params` and the session behind Suspense and calls `getOpportunity(db, { id, profileId })` from `src/lib/opportunities.ts` (also used by the JSON route). 404 when the tender does not exist.

Layout follows the wireframe: breadcrumb (Opportunities, REF externalId, source), H1 title, buyer · region · value · posted date; a closing box with the date and "9 days left" (red when under 7 days, with the words, never colour alone); the primary red button; then two columns on desktop (notice facts left, score right) that stack on phones with the score first.

**Official link.** When `officialUrl` is set: primary button "Open the notice on {source}", `target="_blank"` with `rel="noopener noreferrer"` and a visually hidden "opens in a new tab". When it is null: a secondary button "Find it on {source}" linking to `source.baseUrl`, a line "This notice has no direct link. Search for reference {externalId}" with the reference in mono and a Copy button, and the primary styling goes to nothing else on that screen. The CanadaBuys adapter in M4 fills the notice page URL where it can; the fallback stays for the rest.

**Score panel** (asphalt card): "92" in signal red at 56 px with "/100" in mono paper, the band word, then five bars in the fixed order Category match 40, Location and eligibility 20, Contract size 15, Timeline and capacity 15, Credentials 10, each with "38 / 40" beside it and a `role="meter"` with `aria-valuenow` and `aria-valuemax`. When `reasons.gaps` carries `categoryCap`, a line under the total says the score is capped at Low and why. Below, "Scored on your questionnaire answers. Update them" linking to `/questionnaire/basics`. Not scored yet: the panel says "Your score is on its way" and shows no bars. Ineligible: the panel shows "Not eligible" and the rule-out reasons, no number, as the UI guide requires.

**Fit assessment**: three lists, In your favour, Gaps to close, Could rule you out, each omitted when empty, each item a reason rendered through next-intl (next section).

**Notice**: description with line breaks kept (`whitespace-pre-line`), tags for category codes, language, published and closing dates, value, buyer type, source name.

## Reasons through next-intl

Stored reasons are `{ code, params, text }` with codes in `REASON_CODES` and params carrying codes, never labels. The messages file gets:

- `Reasons.<code>`: one ICU message per code, for example `categoryMatch: "Matches your category: {category}"`, `timelineTight: "Closes in {days} days, under your {lead} day lead time"`, `referencesRequested: "References are requested"`, `referencesRequestedCount: "{count, plural, =1 {One reference is requested} other {# references are requested}}"`, `certificationMissing: "Requires {list}, which you do not list"`.
- `Vocab.categories.<code>`, `Vocab.buyerTypes.<code>`, `Vocab.regions.<code>`, `Vocab.teamSizes.<code>`, `Vocab.certifications.<key>`, `Vocab.clearances.<code>`, `Vocab.languages.<code>`: the labels the questionnaire, filters, tags and reasons all share. Certification codes contain dots and spaces ("P.Eng.", "SOC 2"), which next-intl cannot use as keys, so `src/lib/scoring/labels.ts` gains a code-to-key map (`soc2`, `iso27001`, `iso9001`, `pEng`, `healthCanadaLicence`).

`src/components/score/reason-text.tsx` exports `useReasonText()`: for a reason it labels each param code through `Vocab`, joins list params with "or", picks `referencesRequestedCount` when `count` is present, and calls `t(code, params)`. It calls `renderReason` from `reasons.ts` with a message map built from `t`, and `t.has(code)` guards the map so an unknown code falls back to the stored English text instead of throwing. Stored JSON is parsed with a small `reasonSetSchema` on read; a row that fails it renders no reasons rather than crashing the page.

A unit test reads `messages/en.json` and asserts every code in `REASON_CODES` has a `Reasons` message, and a second test renders every template with sample params and asserts no `{` is left in the output. This is what makes a wording change a messages-only change.

Dates use the `short` format already in `src/i18n/request.ts`; money uses the `cad` number format for exact values and a compact "$1.2M" helper for the list.

## Sign in and create account

Already built in M0 and already on the tokens. M3 changes: the redirect targets above, a `main` landmark and H1 check, the autocomplete attributes kept, and the axe pass. No visual rework unless the pass finds something.

## Files

New:

- `prisma/migrations/<ts>_m3_profile_credentials_and_notice_link/`
- `src/lib/boss.ts`, `src/lib/profile.ts` (upsert and read helpers), `src/lib/format.ts` (compact money, days until)
- `src/app/api/profile/route.ts` (+ test), `src/app/api/opportunities/[id]/route.ts` (+ test)
- `src/app/questionnaire/[step]/page.tsx`, `src/app/opportunities/page.tsx`, `src/app/opportunities/[id]/page.tsx`, `src/app/opportunities/[id]/not-found.tsx`
- `src/components/questionnaire/*`, `src/components/opportunities/*` (filters, table, card, scoring-against panel, empty states), `src/components/score/*` (score chip, factor bars, reason text), `src/components/app-nav.tsx`
- `src/components/ui/radio-group.tsx`, `src/components/ui/textarea.tsx`
- `playwright.config.ts`, `e2e/onboarding.spec.ts`, `e2e/accessibility.spec.ts`, `e2e/helpers.ts`

Changed: `prisma/schema.prisma`, `src/lib/schemas/vocab.ts`, `company-profile.ts`, `tender.ts`, `src/lib/queues.ts`, `src/worker/jobs/scoring/index.ts`, `src/lib/scoring/types.ts`, `factors/location.ts`, `reasons.ts`, `labels.ts`, `score.ts`, `run.ts`, `fixtures/golden.json`, `src/lib/opportunities.ts`, `src/lib/schemas/opportunities.ts`, `src/proxy.ts`, `next.config.ts`, `src/app/(auth)/actions.ts`, `src/components/top-bar.tsx`, `messages/en.json`, `.env.example`, `package.json`, `.github/workflows/ci.yml`, `CLAUDE.md`, `docs/development-guide.md` (clearance rule, PUT /api/profile shape).

Removed: `src/app/dashboard/*` (redirect kept).

Dependencies (current versions on Oct 28, 2026, each read from its official docs before use): `react-hook-form` 7.91.0, `@hookform/resolvers` 6.0.2, `zustand` 5.0.16; dev `@axe-core/playwright` 4.14.0. `@playwright/test` 1.64.1 is already installed.

## Playwright

`playwright.config.ts` at the repo root, tests in `e2e/` (a new top-level folder, named in the architecture doc's layout once approved). Chromium only, two projects: desktop at 1280 px and phone at 375 px. `webServer` is an array: `npm run dev` on port 3000 and `npm run worker`, both reusing an existing server locally. The test database is the local Postgres from `compose.yaml`, migrated and seeded first.

`onboarding.spec.ts`: create an account with a unique `e2e+<timestamp>@beaverbids.test`, answer all five steps (the sample profile's answers, so the sample tender scores 92), land on `/opportunities`, wait for the first row to show "92" (the worker runs `score-profile` within seconds; the test reloads until the chip appears, up to 60 s), open it, assert the H1, the five bars with "38 / 40" first, the three assessment lists and the notice link. Teardown deletes the user through Prisma so the cascade clears the profile and scores.

`accessibility.spec.ts`: signs in as the seeded dev account and runs `AxeBuilder` with the WCAG 2.2 AA tags on `/sign-in`, `/create-account`, `/questionnaire/work`, `/opportunities` and one listing detail, on both projects, asserting zero violations; plus keyboard checks (tab from the search box to the first title link and press Enter opens the detail; tab through a step form reaches Continue). The items axe cannot check (200 percent zoom, reduced motion, copy rules) are a manual list in the pull request.

CI: a fifth job `e2e` in `ci.yml` that installs Chromium, migrates, seeds, and runs `npx playwright test`. Recommended so "done when the test passes" is enforced on every pull request; say if you would rather keep it local for now.

## Accessibility notes that change the design

- **Band colours on white fail small text.** Medium amber and low grey sit near 3.6:1 against white and 4.4:1 against asphalt, under the 4.5:1 the guide sets for text. So the band colour never carries small text: the score number and band word are asphalt (or paper on the dark panel), and the band colour fills the chip border and the bars only. Large text (the 32 px and 56 px numbers) may use the band or signal colour, since 3:1 is enough there. This keeps the guide's "never colour alone" rule and leaves the three band hexes for design to confirm.
- The questionnaire rail uses `aria-current="step"`; the step change is announced through a live region.
- Factor bars are `role="meter"` with the numbers beside them, so screen readers get "38 of 40".
- The closing urgency is words ("9 days left"), with red as the third cue only.
- Focus rings stay the 2 px asphalt outline from `globals.css` on every control, including the option cards and the row link.

## Tests written with the code

- Schemas: credentials step accepts and rejects clearance codes, `profileStepSaveSchema` rejects a wrong step and a payload from another step, `tenderInputSchema` accepts a null link.
- Queues: `scoreProfileJobSchema` rejects a missing or empty `profileId`; the worker handler fails such a job without calling `scoreAll` for everyone.
- Route handlers with mocked session, database and boss: `GET /api/profile` 401 and 404; `PUT /api/profile` 401, 400 with paths, 409 on a non-basics step without a profile, upsert and enqueue called with the database id, a send failure still returns 200; `GET /api/opportunities/[id]` 401, 404, shape.
- Scoring: clearance held satisfies the check and emits `clearanceHeld`; golden set 25 pairs passes; sample still 92 with 38, 19, 14, 12, 9.
- Opportunities: cursor union round trip, two-phase ordering (unit with mocks, integration against the database).
- Reasons: every code has a message; every template renders clean.
- Playwright: the two specs above.

Lint, typecheck (which also checks every message key through `global.ts`), tests and `prisma validate` must pass before the pull request.

## Assumptions you can override

- Route names: `/questionnaire/[step]` and `/opportunities`; `/dashboard` redirects permanently.
- The questionnaire saves through `PUT /api/profile` called from the client, one step per request, and the body shape is `{ step, answers }`. The full-profile `PUT` from the guide can be added later without changing the step shape.
- The web app sends jobs with its own pg-boss instance; a failed send never fails the save.
- `officialUrl` becomes nullable now rather than in M4, so the fallback can be built and tested against a fixture with a null link.
- A clearance on the profile satisfies any clearance requirement regardless of level; `rules-3`. The level is stored so a later rule can compare it.
- `indigenousBusiness` is stored and passed to scoring but changes no score until M4, as the category cap plan schedules it.
- The score sort uses the two-phase cursor above rather than raw SQL, to keep the typed Prisma query builder and its tests.
- The e2e job is added to CI.
- The band word and score number are set in asphalt, not in the band colour, for the contrast reason above.

## Out of scope

Instant score, save and hide, Saved and Hidden tabs, digest and consent, events, French copy and the switcher, AI reasons, website pre-fill, the conditional set-aside extractor and gate (M4), the CanadaBuys adapter (M4), Stripe.
