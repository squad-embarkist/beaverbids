# Project Brief: AI RFP Fit and Proposal Platform

Oct 14, 2026 · @CJD

## Overview

We are building a web app that tells a company in seconds whether an RFP is worth chasing, then drafts the response for them. The goal is the shortest possible path from a prospect landing on the site to their first scored RFP and first draft proposal: Publicus-level simplicity, with a stronger score-to-proposal flow than SamSearch.

- **Working name:** BeaverBids
- **Launch market:** Canada, launching on the CanadaBuys open data file (federal tenders) and adding provincial portals only as each one allows it (from the build spec and the architecture document)
- **Must-have features:** a /100 RFP Fit Score and an AI Proposal Writer, built as one connected flow
- **Benchmarks:** SamSearch (main competitor), BidClarity and CanadianBidsAI (named in the spec, the latter not yet reviewed), and Publicus (UI inspiration, reported by the client at about $30k MRR, not independently verified)
- **Design principle:** as little friction as possible between us and the prospect

Low-fidelity wireframes of the main screens, styled with the BeaverBids design system, are in [BeaverBids low-fi wireframes](https://claude.ai/artifact/EZV9n94b7kYQoEvGVqeUqQ). The user flow and screens below follow them.

## Definition of terms

Plain-language meanings for the terms used in this brief. The app itself should avoid the jargon terms, or explain them inline.

| Term | Meaning |
| --- | --- |
| RFP (request for proposal) | A document where a buyer, here usually a government body, describes what it wants and invites businesses to bid |
| Tender | The general word for a published buying opportunity, including RFPs and similar notices |
| Opportunity or listing | One published tender, as stored and shown in the app |
| Buyer | The government body or agency that issues the tender |
| Source portal | The public site a listing comes from, such as CanadaBuys |
| CanadaBuys | The Canadian federal government's official procurement site |
| Scraper | A program that collects listings from a source automatically, once a day in the MVP. At launch it downloads the CanadaBuys open data file instead of scraping pages |
| NAICS and UNSPSC | Standard code systems that classify what a business sells or what a tender buys  &#91;image: image.png\] |
| Set-aside and certification | A tender reserved for a group, such as Indigenous-owned businesses, and the proof a business holds to qualify |
| Business profile | What the user tells us: company, what they sell, industry, provinces served, certifications and optional past work |
| Feed | The list of listings matched to the user's profile |
| Fit score | A number out of 100 showing how well a listing suits the user's business, with reasons |
| High, Medium and Low | The badge bands the score maps to, which the spec uses in the feed |
| Instant score | A first score from a pasted tender link or PDF and the company website, shown before any account or questionnaire |
| Hard gate | A deal-breaker, such as the wrong province or a missing mandatory certification, that caps the score or removes the listing |
| AI Proposal Writer | The feature that drafts a proposal from a listing and the user's profile |
| Needs-input marker | A flag in a draft where the user must supply a fact, so nothing is invented |
| Requirements checklist | A list of every mandatory item a tender asks for |
| Compliance check | A review that the proposal covers every requirement, page limit and form (Phase 2) |
| Pipeline | The user's board of tracked opportunities: Watching, Preparing, Submitted, Won, Lost |
| Saved search and digest | A saved filter and the daily or weekly email of new matches it produces |
| Teaming | Partnering with another business to bid on a contract too big to bid alone |
| LLM and embeddings | The AI language model used for summaries and drafts, and the text-similarity method used for cheap first-pass matching |
| MVP and Phase 2 | The first version we build, and the later upgrades planned once people use it |
| MRR | Monthly recurring revenue, the metric the client quoted for Publicus |

## Competitor snapshot

SamSearch is broad but sells through demos, and Publicus is simple but stops short of proposal writing. The open space is a self-serve product that scores an RFP and then writes the response.

| Area | [SamSearch](https://samsearch.co) | [Publicus](https://publicus.ai) | Gap we can take |
| --- | --- | --- | --- |
| Positioning | All-in-one platform across six stages, from market intelligence to financing | Procurement intelligence: daily briefings, renewals, award analytics | One tight flow: score, then draft |
| Coverage | Federal, state and local, grants, subcontracting, Canada | Canadian federal, provincial, municipal and MASH sources | Pick a launch market (to confirm with client) |
| Fit scoring | Fit graded against company profile, set-asides and past performance | Percent fit on matched opportunities in the daily briefing | A /100 score with a visible breakdown and reasons |
| Proposal writing | Compliance matrix from the RFP, drafts grounded in your library, form filling | Not listed on its homepage or plans | Make the writer a hero feature, driven by the score |
| Entry point | Request a demo; onboarding runs about a week | Work email, free trial, no card, first matches within 24 hours | Score an RFP in the first minute, before signup |
| Pricing | By seat and module, annual, quoted on a demo call | [$250 per user a month, or $200 billed annually](https://publicus.ai/pricing); custom Enterprise | Published self-serve pricing |
| Interface | Broad platform with six modules to learn | Light and clean, one feed with save, relevant and dismiss actions | Publicus-level simplicity with fewer screens than SamSearch |

BidClarity, named in the spec, already scores contracts from 0 to 100 on five dimensions with High, Watch and Low bands, and treats eligibility as a gate (see its [scoring page](https://bidclarity.ai/how-scoring-works)). A /100 score alone will not set us apart. Showing the reasons and letting people score a listing before signing up will. Its trial also asks for a card at signup, which leaves us room to be lighter.

## How we stand out

Our edge is a connected, self-serve flow that neither competitor offers in one place: a score the user can trust, feeding straight into a draft. Four differentiators carry it.

1. **Try before you sign up.** A visitor pastes an RFP link or drops a PDF on the homepage and sees a /100 score within a minute, with no account. Publicus asks for an email first, and SamSearch asks for a demo.
2. **A score that shows its work.** Every point traces back to a line in the RFP and a line in the company profile, so a bid or no-bid call takes seconds and can be defended internally.
3. **The score feeds the writer.** Strengths become win themes, gaps become flagged sections, and the outline follows the RFP's own requirements so nothing required is missed.
4. **Honest drafting.** Each claim in a draft cites its source, and anything the system cannot support is marked "needs your input" instead of being invented.

## Target users and jobs to be done

The spec names the user: a small business owner who wants government contracts but finds the official portals clunky, not a procurement analyst. Language, layout and onboarding should fit that person.

- **Primary:** founders and BD leads at small firms, bidding on a handful of RFPs a month
- **Secondary:** freelance proposal writers and small bid teams of two to five people
- **Job 1:** decide in minutes whether an RFP is worth the effort
- **Job 2:** start from a compliant first draft instead of a blank page
- **Job 3:** see exactly what is missing before investing time in a bid

## Must-have 1: the /100 RFP Fit Score

The score answers one question, "should we bid?", as a number out of 100 with reasons the user can check. The weights below are a proposed starting point to tune with the client.

| Component | Points | What it checks |
| --- | --- | --- |
| Category match | 40 | Whether the tender's categories and buyer type match what the company does and has worked on |
| Location and eligibility | 20 | Provinces worked in, language, set-asides and mandatory requirements |
| Contract size | 15 | Contract value against the size of work the company gave |
| Timeline and capacity | 15 | Deadline against available time and team size |
| Credentials | 10 | Certifications, bonding and insurance |

How the score behaves:

- **Hard gates:** a province mismatch removes the listing from the feed, as in the spec, and a failed mandatory requirement such as a missing certification caps the score with a clear "not eligible" flag, so a high total never hides a deal-breaker.
- **Verdict bands:** 75 to 100 High, 50 to 74 Medium, under 50 Low (proposed). These map to the spec's High, Medium and Low badges, with the /100 number shown beneath.
- **Shows its work:** the top reasons for and against, each linked to the RFP page and the profile line that produced it.
- **Admits uncertainty:** ambiguous or unreadable RFP text is flagged for a human check instead of guessed.
- **Profile source:** the instant score uses a pasted tender link or PDF and the company website URL, then the onboarding questionnaire confirms or corrects the profile for the scores across the whole feed.

**Cost control:** the spec asks us to score every new listing, every day, for every user. Use the rules-based province and category checks plus embeddings first, and call an LLM only to write summaries and reasons for listings that pass.

## Must-have 2: the AI Proposal Writer

The writer turns an opportunity into an editable first draft. The MVP follows the spec: a strong starting draft on a standard structure, not a guaranteed-compliant final document. The compliance-structured builder is Phase 2.

1. **Start from the listing.** A "Draft proposal" button on the opportunity page uses the listing text and attached documents, the business profile, and the optional past-experience blurb.
2. **Standard structure.** Company overview, understanding of requirements, approach, relevant experience, pricing placeholder and closing.
3. **Needs-input markers.** Missing facts such as references, certifications and pricing are flagged for the user, never invented.
4. **Editor.** Plain or rich text in the browser, with regenerate for a single section such as "company overview".
5. **Export.** PDF or Word, so the user can actually submit it.
6. **Clear label.** "AI draft, review before submitting" shown in the editor.
7. **Phase 2 upgrade.** Requirements checklist, an outline built from the RFP's own criteria, compliance check before export, and richer inline AI rewriting.

The link to the score is still the key difference: strengths from the score become suggested themes in the draft, and gaps become needs-input markers. A light requirements checklist is worth pulling forward from Phase 2, because the score's reasons need the same extraction.

## Friction principles

Every screen should answer one question: does this step help the user reach a score or a draft faster? Publicus's no-card trial and SamSearch's demo-first approach show the two ends of the range, and we aim for the low-friction end.

- **Value before signup:** the first score needs only an RFP and a website URL. The account is requested when the user saves or continues.
- **No passwords:** sign in with Google, Microsoft or a work-email link. No credit card for the trial.
- **Profile from a URL:** the company profile is pre-filled from the website, and the user confirms instead of typing.
- **One main action per screen:** a single clear button, with advanced options tucked away until needed.
- **Visible progress:** the score reasons stream in as the RFP is read, so waiting feels short.
- **Self-serve pricing:** a published pricing page and in-app checkout, with a demo as an option rather than a gate.

The spec adds three rules we keep: plain language with no RFP or NAICS jargon unless explained inline, mobile-responsive screens (the editor is desktop-first but must not break on a phone), and one clear action per screen. The profile form should take under five minutes, and its free-text description is the most important input, so it should feel that way. The pre-signup score goes beyond the spec, which starts with signup and the profile form, so treat it as our main differentiator and the form as the fallback.

## User flow

A first-time visitor gets a score before creating an account and signs up only once they decide to bid. The questionnaire then teaches BeaverBids what the company does, the opportunities list shows scored tenders, and the listing detail gives everything needed to bid or bin it before sending the user to the official portal. The proposal editor and the pipeline board come in a later phase.

&#91;embedded content: user flow, landing to export, 2 decisions\]

Read the top row left to right, then the second row right to left. The line under the first three steps marks the part that needs no account, and answering no at the bid decision sends the visitor back to try another tender. Dashed boxes are the later phase. Returning users come in through the Monday email digest and land on the opportunities list.

**Screens in the wireframes**

Each screen has its own wireframe in the section after this table. The Saved list is not drawn yet.

| # | Screen | What is on it | Main action |
| --- | --- | --- | --- |
| 1 | Onboarding questionnaire | Five steps: company basics, what you do, where you work, size of work, credentials. Ten categories, answers pre-filled from the website, a panel showing the points each step is worth, Save and finish later, EN and FR | Continue |
| 2 | Opportunities list | One feed (six portals drawn, CanadaBuys only at launch), score out of 100 and a reason on every row, red markers for warnings, Not a fit, Save and View, filters, New, Saved and Hidden tabs, Monday digest, a panel to sharpen scores | View |
| 3 | Listing detail | Four-point plain summary, about the buyer, about the job, five-factor fit score, fit assessment (in your favour, gaps to close, could rule you out), Raise this score, documents | Open the full RFP on the source portal, or Save |
| 4 | Landing and instant score | Headline "Bid it or bin it.", a tender link or PDF drop, a website field, then a sample result with the five factors. No account, no card | Score this tender, then Save this score |
| 5 | Proposal editor (later phase) | Six sections, empty squares for what needs input, regenerate per section, "AI draft. Review before submitting.", Before you send checklist | Export PDF |
| 6 | Pipeline board (later phase) | Watching, Preparing, Submitted, Won, Lost with a note on each card | Open a card |
| 7 | Mobile opportunities | One column with New, Saved and Hidden tabs and a bottom bar | Open a tender |
| 8 | Mobile instant score | Score, five factors and two reasons | Save this score |

### Wireframe screens

The wireframes below are the current design, in flow order. The three core screens come first, then the landing page and the screens for a later phase. Sample data and bracketed placeholders stand in for real facts. The live canvas is [BeaverBids low-fi wireframes](https://claude.ai/artifact/EZV9n94b7kYQoEvGVqeUqQ).

**Core screens**

**1. Onboarding questionnaire**

&#91;image: 1. Onboarding questionnaire\]

Five short steps: company basics, what you do, where you work, size of work, credentials. Ten procurement categories, answers pre-filled from the company website, buttons and checkboxes wherever possible, and a panel showing how many points each step is worth. About five minutes, with no demo call or sales form.

**2. Opportunities list**

&#91;image: 2. Opportunities list\]

The daily home screen. One feed. The wireframe draws six portals (CanadaBuys, MERX, BC Bid, SEAO, NBON and Alberta Purchasing Connection), but launch connects CanadaBuys only and adds the rest as each one allows it. Every row has a score out of 100, a reason written from the user's own answers, and red markers for warnings or blockers. Not a fit, Save and View on each row. Filters for search, category, province, portal, minimum score and closing date, with New, Saved and Hidden tabs and a Monday digest.

**3. Listing detail**

&#91;image: 3. Listing detail\]

Everything for a bid or bin decision on one page: a four-point plain-language summary, about the buyer, about the job, and the fit score out of 100 with all five factors. A written fit assessment (in your favour, gaps to close, could rule you out), a Raise this score panel, documents, and a link to open the full RFP on its source portal.

**Landing page and later phase**

**4. Landing and instant score**

&#91;image: 4. Landing and instant score\]

A tender link or PDF and a website give a score out of 100 with reasons, with no account and no card. Saving the score leads to the onboarding questionnaire.

**5. Proposal editor (later phase)**

&#91;image: 5. Proposal editor\]

The AI first draft in six sections, with empty squares for what needs input, a regenerate button per section, an "AI draft. Review before submitting." label, and a Before you send checklist.

**6. Pipeline board (later phase)**

&#91;image: 6. Pipeline board\]

Watching, Preparing, Submitted, Won and Lost, with a note on each card. Each card opens its listing.

**7. Mobile opportunities**

&#91;image: 7. Mobile opportunities\]

**8. Mobile instant score**

&#91;image: 8. Mobile instant score\]

## Scope

The MVP follows the BeaverBids build spec, with two additions we recommend: a /100 score on top of the spec's High, Medium and Low badges, and a pre-signup instant score. Both reuse the same matching logic, so they should add little to the build.

| Phase | What ships |
| --- | --- |
| MVP: data | Daily import of the CanadaBuys open data file (federal tenders, free under an open licence, no scraping) with a Sentry alert when the import fails or returns nothing; per listing: title, description, buyer, category code, region, dates, value if published, reference number, source link, attached PDFs and source portal name |
| MVP: product | Signup with a profile form under five minutes, matched feed with score badge, cached plain-language summary per listing, opportunity page, bookmarks, pipeline board with notes, saved search with daily or weekly email digest, account settings |
| MVP: proposal writer | Draft from the listing and profile on a standard structure, editable text, section regenerate, PDF and Word export, "AI draft" label |
| Recommended additions | /100 score with reasons on every listing, and an instant score from a pasted listing or PDF before signup |
| Next portals | Ontario Tenders Portal, BC Bid, NBON, Alberta Purchasing Connection, SEAO, Bidsandtenders, MERX. Each is added only after its terms are checked. MERX and Bidsandtenders forbid copying or scraping today, so they wait for written permission |
| Phase 2 | Compliance-structured proposal builder, document assistant with Q&A, outline generator, partner and teaming search, procurement forecasts, opportunity insights, pipeline hub, multiple alerts, market watch, attachment summaries |

## Architecture and tech stack

This is the plan from the senior developer's architecture document (BEAVERBIDS\_ARCHITECTURE.pdf), adopted for phase 1. It uses one language, TypeScript, for the web app, the API and the background worker, and it launches on the free CanadaBuys open data file, so no scraping is needed on day one. A separate Python service for heavy document and AI work stays a later option, not a launch need. The development team should still confirm each choice before the build starts.

**How the data flows**

1. A scheduled job in the worker downloads the CanadaBuys open tender file each morning and saves the raw file untouched, so any day can be processed again.
2. The file is read and each tender is saved in the database, with changes and amendments matched to the tender already stored.
3. Scoring runs in the worker. Rules produce the score out of 100 and its five factors, and an AI model, called through one gateway, only writes the short reasons for listings that score Medium or High.
4. The web app and its API, one Next.js project, serve the feed, the listing detail and the instant score. Sign-in uses sessions stored in our own database.
5. The Monday digest goes out by email, and Sentry alerts the team when the website is down, an import fails or the morning import does not run.
6. In the later phase the proposal writer, editor and pipeline board reuse the same app, database and AI gateway.

&#91;embedded content: system flow, CanadaBuys file to user, with a later phase writer\]

Read the top row left to right, then the second row right to left. The highlighted box is the scoring engine. The dashed box is the later phase proposal writer. The web app and the API are one Next.js project, and the worker is a second process on the same server.

| Layer | Recommended choice | Why |
| --- | --- | --- |
| Web app and API | Next.js with React and TypeScript, Tailwind CSS and shadcn/ui, English and French from day one | The landing page, the app and the API are one project deployed once, and bilingual support is far cheaper to add at the start |
| Forms and state | React Hook Form, Zod and Zustand | The same Zod rules check the form in the browser and the request in the API, and Zustand keeps the questionnaire answers across the five steps |
| Sign in | Better Auth with email and password or Google, sessions stored in our own database | Built for Next.js, and we can end any login at any time |
| Database | PostgreSQL with Prisma | One store for tenders, profiles, scores, logins and the job queue, with tables described once |
| Background jobs | pg-boss in a separate worker | The job queue lives in Postgres, so there is no Redis to run, and it retries failed jobs and schedules the daily import and the Monday digest |
| Tender data | The CanadaBuys open data file, read with csv-parse. Later, Cheerio for MERX and Lightpanda for Bids&Tenders | CanadaBuys shares the file free under an open licence, with no legal risk. The other two only after written permission, since their terms forbid copying today |
| Files | AWS S3 | Keeps the raw daily file, uploads and database backups |
| AI | MixRoute gateway behind one wrapper in our own code, with one key and spending cap per module | One module cannot use up the whole budget, and the provider can be swapped. Its data handling still needs checking |
| Email | Amazon SES | The Monday digest and account emails. AWS can take up to 96 hours to approve production sending, so request it early |
| Hosting | A Hetzner server in Ashburn, Virginia, run with Coolify and Docker behind Cloudflare, with staging and production | The server is already paid for. Data is stored in the United States, not Canada, so residency is still to be decided |
| Monitoring | Sentry for errors, Sentry Uptime for the website and Sentry Crons for the daily import | The site can be up while the worker is down, and Crons catches a missed import |
| Delivery | GitHub with feature, development, staging and main branches, deployed through Coolify | Standard and easy to hand over. Automated tests in GitHub Actions are recommended on top |
| Payments | Stripe, decided with the pricing question | Not in the architecture document yet |
| Proposal export | Chosen when the writer is built | Word and PDF export belong to the later phase |

**Rules that protect trust and cost**

- Facts shown in a score or summary come from the tender text and cite the source. The AI does not fill gaps from memory.
- Scores come from rules. The AI writes the short reasons and never changes the number.
- Unclear or unreadable tender text is flagged for a human check instead of guessed.
- Summaries and reasons are cached per listing, so each is generated once, not once per user.
- No source other than the CanadaBuys open data file is imported until its terms are checked and written permission is on file.
- CanadaBuys covers federal organizations only, so the launch feed shows federal tenders and no provincial or municipal ones.
- The instant score reads a pasted tender link or PDF and a website before any signup. The architecture document does not cover this yet: it needs safe fetching of links, PDF text extraction, an AI call and limits against abuse, so the development team must confirm how to build it.

## Success metrics

These are proposed starting targets to validate with the client, tuned once real usage data exists.

| Metric | Proposed target |
| --- | --- |
| Time from landing to first score | Under 60 seconds |
| Visitors who get a scored RFP | 25% |
| Scored RFPs that become accounts | 30% |
| New accounts that generate a draft within 7 days | 50% |
| Drafts that are exported | 40% |
| Reviewed scores where the user agrees with the verdict | At least 80% |

## Risks and items to confirm

The spec settles the launch market (Canada, starting with CanadaBuys) and the feed question. These items are still open.

| Confirm with the client | Why it matters |
| --- | --- |
| /100 score or High, Medium and Low only | The spec says badges are enough for the MVP, but this project's must-have is a /100 score |
| Portal terms and data feeds | MERX and Bidsandtenders forbid copying or scraping today. Only the CanadaBuys open data file is used until written permission is on file |
| Native iOS and Android app, or responsive web only | The spec hints at a downloadable app, which changes the build |
| LLM provider and cost per listing | Every new listing is scored daily for every user |
| Pricing and trial terms | BidClarity asks for a card at signup, Publicus does not |
| Budget, timeline and final brand name | Needed to size the build and start design |

Main risks to manage:

- **Score trust:** a number without reasons will be ignored, so explanations are part of the MVP, not an extra.
- **Invented content:** a proposal that makes up references or certifications damages the user, so citations and needs-input markers are required.
- **RFP parsing quality:** scanned or messy PDFs will produce weaker scores, so the app must flag low confidence.
- **Security expectations:** both competitors advertise SOC 2 and no training on customer data, so we should plan to match that.

## Sources

Competitor details come from the pages below, opened on 2026-10-14. Competitor claims reflect each company's own marketing and were not independently verified.

- [SamSearch homepage](https://samsearch.co): six-stage platform, fit grading, compliance matrix, drafting, demo-based pricing, onboarding timeline
- [Publicus homepage](https://publicus.ai): daily briefing with percent fit, work-email start, no-form signup, Canadian coverage
- [Publicus pricing](https://publicus.ai/pricing): Single User and Enterprise plans, trial terms, billing currency

* [BidClarity scoring page](https://bidclarity.ai/how-scoring-works): 0 to 100 score, five dimensions, High, Watch and Low bands, eligibility gate, trial terms
* BeaverBids build spec: client-supplied PDF with the MVP scope, data sources and screens
