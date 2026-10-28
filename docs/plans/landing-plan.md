# Landing page: build plan

Oct 28, 2026 · Status: approved Oct 28, 2026, built on `feature/landing-page`

Build the public landing page from the Figma file "Beaver bids website", frame "beaverbids - direction 2 - updated with canada colors" (node 1:957, 1549 × 4388 px): layout, colours, type, square corners, condensed buttons and copy, with no design changes. The brand tokens in `src/app/globals.css` and `docs/ui-ux-guide.md` are updated to match the file. The only copy change is removing em dashes. The demo form opens a plain email link. The play button is left out until there is a video. Tablet and phone follow the responsive rules in this plan, since the file holds no tablet or mobile frame.

Done when the page at `/` matches the Figma frame at 1549 px, holds at 375 px and at 200 percent zoom, lint, typecheck and tests pass, and the branch is merged into `development` and then `staging`. No pull request into `main` until the claims in the copy are approved.

Not built: the demo video and play button, any email sending, the instant score, French copy, the sign-in link in the header (the Figma header has none).

## What the Figma frame fixes

| Section | Background | Layout at 1549 px |
| --- | --- | --- |
| Header, sticky | paper at 90 percent, 1 px asphalt 15 percent bottom rule | 72 px tall plus the rule. Wordmark "BEAVERBIDS" with the mono tag "· BIDDESK", three mono nav links, red button 166 × 40 |
| Hero | stone #CBC7BE | 1240 container, two columns 713 / 527. Left: 6 px signal left border, padding 80 top and bottom, 40 sides. Right: photo 527 × 817 |
| Ticker | asphalt | 46 px row of mono labels with middle dots, 32 px gaps, inside the 1240 container with 24 px padding |
| The problem | paper | padding 96 / 24. Columns 508 / 620, 64 px gap. Right: 2 × 2 stats, 32 px gaps, 2 px asphalt top rule per cell |
| Three steps | asphalt | padding 96 / 24. Heading row space between. Three cells on a 1 px hairline grid (parent tinted #7C7970 at 30 percent, 1 px gaps), 32 px padding |
| Demo | stone | 620 / 620 split. Left: photo 620 × 611 with the "Demo · 1:30" label bottom left. Right: padding 80 / 48 |
| Who it is for | paper | padding 96 / 24. Three cards 381 wide, 24 px gap, 28 px padding, fill #DEDBD3, 1 px asphalt 15 percent border |
| Coverage | asphalt | padding 80 / 24. Columns 461 / 691, 40 px gap. Right: 4 × 2 hairline grid, cells 92 px minimum, 16 px padding |
| Request a demo | stone left, paper right | 670 / 570 split. Left: 6 px signal left border, padding 80 / 40. Right: padding 80 / 40, form 490 wide |
| Footer | asphalt | padding 48 / 24. Left: wordmark, tag and a 320 px blurb. Right: photo 80 × 96 and three mono links. Hairline, then the copyright row |

Section heights are content driven; the pixel heights in the file are not fixed in code.

**Type.** Archivo ExtraBold at width 125 for every headline, Archivo Bold at width 75 (condensed) for buttons, card titles and portal names, Archivo Regular at width 100 for body, IBM Plex Mono Regular for every label. Both Archivo cuts come from the one variable font `layout.tsx` already loads with the width axis.

| Style | Size / line height | Tracking | Where |
| --- | --- | --- | --- |
| Hero H1 | 86.4 / 79.5 px | -0.864 px | Stop reading portals |
| Section H2 | 48 / 47 to 48 px | -0.48 px | The problem, Three steps, Built for the shop, Coverage, Request a demo |
| Demo H2 | 52 / 51 px | -0.52 px | Numbers do the persuading |
| Stat figure | 48 / 48 px | -0.48 px | 8+, 70%, 3 days, $0 |
| Hero figure | 72 / 72 px, signal | -0.72 px | 6 HRS |
| Wordmark | 20 / 28 px header, 24 / 32 px footer | -1 percent | BEAVERBIDS |
| Card H3, condensed bold uppercase | 24 / 32 px | 0.6 px | Step and audience titles |
| Portal name, condensed bold uppercase | 18 / 28 px | 0.45 px | Coverage grid |
| Button, condensed bold uppercase | 16 / 24 px; header 14 / 20 px | 0.4 px; 0.35 px | All buttons |
| Lead | 18 / 29.25 px | | Hero, demo, request a demo |
| Body | 15 / 24.375 px | | Steps, audience cards |
| Body small | 14 / 19.25 px; 16 / 26 px; 15 / 22.5 px; 14 / 22.75 px | | Stat captions; coverage lead; demo list; footer blurb |
| Mono eyebrow | 12 / 18 px uppercase | 2.4 px (hero 2.64 px, steps 2.16 px) | Section labels |
| Mono nav and ticker | 12 / 18 px uppercase | 1.68 px nav, 1.44 px ticker and footer links | Header, ticker, footer |
| Mono small | 11 / 16.5 px uppercase | 1.98 px; 1.54 px copyright; 2.2 px tag | Form labels, demo label, copyright, BIDDESK tag |
| Mono facts | 13 / 19.5 px | 0.78 px | RE, TERR, RESP lines |
| Mono step number | 14 / 20 px, signal | | 01, 02, 03 |
| Mono card tag | 10 / 15 px uppercase, signal on asphalt | 2 px | PRIMARY, SET-ASIDE, MULTIPLIER |

**Colour.** Flat fills only. The one gradient is the hero photo overlay: photo at 90 percent opacity over asphalt, then a bottom-to-top overlay from asphalt at 80 percent, through 10 percent at the midpoint, to transparent. No radius anywhere. No shadow anywhere.

**Highlighted headline lines** ("START BIDDING.", "WORTH WINNING.", "ONE FEED.", "LIVE DEMO."): a signal block behind the line with the text in asphalt, the block starting at the column edge and the text inset 6 px, so the highlighted line sits 6 px right of the lines above it.

## Tokens and the UI guide

`src/app/globals.css` `:root` changes to the Figma values, and the guide's colour table changes with it:

| Token | Now | Becomes | Note |
| --- | --- | --- | --- |
| `--signal` | #D2311F | #D52B1E | Canada flag red |
| `--signal-press` | #B52A1A | #B8251A | Not in the file; darkened from the new red by the same step as before |
| `--asphalt` | #23221F | #23231F | |
| `--paper` | #F3F1EC | #F4F2ED | |
| `--stone` | none | #CBC7BE | Hero, demo and request-a-demo backgrounds |
| `--stone-light` | none | #DEDBD3 | Audience card fill |
| `--line` | #D9D5CB | asphalt at 15 percent | Hairlines on light backgrounds |
| `--line-dark` | none | #7C7970 at 30 percent | Hairlines on asphalt |
| `--ink-muted` | #6B675E | #7C7970 | |
| `--surface` | #FFFFFF | unchanged | Not used on the landing page; app cards keep it |
| band colours | unchanged | unchanged | Not in the file |
| radius tokens | 4 px and 8 px | 0 | Square corners everywhere, including the sign-in card, inputs and buttons |

Two utilities join the existing `font-expanded`: `font-condensed` (`font-stretch: 75%`) and a `highlight` utility for the headline block. Type sizes for the hero and section headings are added to the theme (`--text-hero`, `--text-section`, `--text-section-lg`, `--text-figure`) so no component carries a raw pixel size.

`src/components/ui/button.tsx` changes to the Figma button: default is signal fill, asphalt text, condensed bold uppercase 16 px with 0.4 px tracking, 56 px tall with 28 px side padding, no radius; `secondary` is a 1 px asphalt 40 percent border on no fill; a new `sm` size is the 40 px header button at 14 px. `src/components/ui/input.tsx` changes to 50 px tall, paper fill, 1 px #7C7970 at 40 percent border, no radius. The auth screens pick these up without edits.

`docs/ui-ux-guide.md` changes: the colour table (values above, stone and stone-light added, hairlines defined as opacities), the typography table (condensed cut for buttons and card titles, the hero and figure sizes, mono tracking), radius set to 0 with the "no pill shapes" line kept for score chips only, the primary and secondary button rows, the input row (50 px, paper fill), a new "Landing page" row in the screen patterns table pointing at the Figma frame, and a contrast note recording the two known failures below. `CLAUDE.md` gets one line under UI: the landing page is built from the Figma frame and its photos live in `public/landing/`.

**Known contrast failures kept on purpose, because the brief says no design changes.** By estimate, #7C7970 is about 3.9:1 on paper, 3.6:1 on asphalt and 2.6:1 on stone, under the 4.5:1 the guide sets for the 11 and 12 px mono labels. Asphalt text on the signal button is about 3.2:1 at 16 px bold, which passes only the 3:1 large-text threshold. Both are recorded in the guide's checklist as open items for design, not fixed in code.

## Copy

Every string is in `messages/en.json` under a new `Landing` namespace, in the file's wording and casing, including the sample ticker ("Job No. 2026-0417", "Closes in 4D 06H", "Est. Value $1.4M") and the form placeholders. The only edits are the ten em dashes:

| Where | Figma | Becomes |
| --- | --- | --- |
| Hero lead | your bonding capacity — in your inbox, Monday, 7 a.m. | your bonding capacity: in your inbox, Monday, 7 a.m. |
| Ticker | Trade — General Contracting | Trade: General Contracting |
| Step 01 | NBON and the rest — you stop tabbing between eight logins. | NBON and the rest. You stop tabbing between eight logins. |
| Step 03 | mandatory criteria — plus a first-draft proposal | mandatory criteria, plus a first-draft proposal |
| Demo lead | a first draft proposal — start to finish. | a first draft proposal, start to finish. |
| Audience card 1 | government work before — you just miss half | government work before. You just miss half |
| Audience card 2 | automatically — no more guessing | automatically. No more guessing |
| Request a demo lead | this week — no obligation, no slide deck. | this week. No obligation, no slide deck. |
| Form note | No spam, no reselling — we only use this | No spam, no reselling. We only use this |
| Copyright | © 2026 BeaverBids — Made in Canada | © 2026 BeaverBids · Made in Canada |

The en dash in "5–100 people" and the middle dots stay. The three photo alt texts are the file's layer names: "A contractor working off an open tailgate with a phone and clipboard at first light", "Board-formed concrete with a single hard diagonal shadow", "Hi-vis vests and hard hats hanging on a site trailer wall".

The claims in the copy (eight portals, 70 percent, 3 days, 6 hours, scraping MERX, BC Bid, SEAO and NBON, AI reading the RFP, first-draft proposals) are shipped as written and gated by you before `main`. This plan does not resolve open question 1 in the development guide.

## Components

`src/app/page.tsx` becomes the landing page, composed from `src/components/landing/`. All are server components except the form.

| File | Content |
| --- | --- |
| `site-header.tsx` | Sticky header. Brand lockup links to `/`. Nav anchors to `#how-it-works`, `#who-its-for`, `#portals`. Red button to `#request-a-demo` |
| `brand-lockup.tsx` | "BEAVERBIDS" in expanded ExtraBold plus the mono "· BIDDESK" tag; `size` prop for the 20 px header and 24 px footer |
| `hero.tsx` | Eyebrow, H1 with the highlighted last line, lead, the two buttons (anchor links), the photo column with the overlay and the "6 HRS back, every week" figure, then the ticker |
| `highlight.tsx` | The signal block behind a headline line |
| `problem.tsx` | Eyebrow, H2 with highlight, the 2 × 2 stat grid |
| `steps.tsx` (`#how-it-works`) | Heading row, three numbered cells on the hairline grid |
| `demo.tsx` | Photo with the "Demo · 1:30" label and no play button, text column with the square-bullet list |
| `audience.tsx` (`#who-its-for`) | H2, three tagged cards |
| `coverage.tsx` (`#portals`) | Eyebrow, H2 with highlight, lead, the 4 × 2 portal grid |
| `demo-request.tsx` (`#request-a-demo`) | Left column with the RE, TERR and RESP lines; right column holds the form |
| `demo-request-form.tsx` | Client component, see below |
| `site-footer.tsx` | Lockup, blurb, photo, three anchor links, hairline, copyright and the email address |

Sections carry `scroll-margin-top` equal to the header height so anchors land below the sticky bar. The page has one H1, each section an H2 with `aria-labelledby`, a visually hidden "Skip to content" link as the first focusable element, and the existing 2 px asphalt focus outline on every link, button and field. The hero photo has `priority`. The ticker is a list with the middle dots as `aria-hidden` separators.

## Demo form

Five fields as drawn: Name, Company, Work email, Province, Trade / industry, each with a visible mono label, then the full-width "Book my demo" button and the mono note. Placeholders are the file's sample values.

Validation: `demoRequestSchema` in `src/lib/schemas/demo-request.ts` (Zod: name and company 1 to 120 characters, a valid email, province and trade 1 to 80 characters). On submit the client component parses the form data with it, shows errors tied to the fields by `aria-describedby`, and on success sets `window.location.href` to the result of `buildDemoRequestMailto(address, values)` from `src/lib/demo-request.ts`: a `mailto:` link with the subject "Live demo request: {company}" and a body listing the five answers, fully URL encoded. No request leaves the browser and nothing is stored. React Hook Form is not added; it arrives with the questionnaire in M3, and this form can move to it then.

The address comes from `NEXT_PUBLIC_DEMO_REQUEST_EMAIL` (added to `.env.example`), and the same value renders in the "RE:" line and the footer, both as `mailto:` links, so the page works without JavaScript and the visible address never disagrees with the link. Your message shows the address as a placeholder; this plan assumes `demos@beaverbids.ca`, the value in the Figma copy, until you give another.

## Images

No photo from the Figma file is downloaded or used. Three flat neutral-grey placeholders are generated locally (a throwaway script writes a PNG of the exact size, `sips` converts it to JPEG; the script is not committed) and checked with `sips -g pixelWidth -g pixelHeight`:

| File | Size | Used by | `sizes` |
| --- | --- | --- | --- |
| `public/landing/hero.jpg` | 527 × 817 | Hero photo column | `(min-width: 1024px) 527px, 100vw` |
| `public/landing/demo.jpg` | 620 × 611 | Demo section | `(min-width: 1024px) 620px, 100vw` |
| `public/landing/footer.jpg` | 80 × 96 | Footer | `80px` |

Each is a `next/image` with the intrinsic width and height above, `className="h-full w-full object-cover"` so the crop matches the file at every width, the alt text from the `Landing` messages, and the hero adds the 90 percent opacity and the gradient overlay as a sibling element. Replacing a file with a real photo of the same name and size needs no code change. The hero and demo placeholders are a mid grey (#8A867C) so the overlay and the signal figure read on them; the footer placeholder is the same grey.

## Responsive rules

The file defines 1549 px only. These rules are the plan's, using the guide's breakpoints.

**1280 px and up.** As designed: 1240 px container, the split sections (hero, demo, request a demo) run edge to edge inside it, the other sections keep 24 px inner padding.

**1024 to 1279 px.** Same structure. The hero H1 drops to 72 px and the section H2s stay at 48 px. The split sections touch the viewport edges; their backgrounds already span the full width.

**768 to 1023 px.** Hero stacks: text column full width with the red left border, then the photo at full width and 480 px tall with the same crop, overlay and figure. H1 64 px. Ticker wraps to two rows. The problem stacks with the stat grid still 2 × 2. Steps become one column of hairline rows. Demo stacks: photo 480 px tall, then the text. Audience cards become one column. Coverage stacks with the portal grid at 2 × 4. Request a demo stacks: text, then the form, which keeps its two-column rows. Footer: lockup and blurb, then the photo and links in a row.

**Under 768 px.** Single column, 16 px gutters. Header keeps the wordmark and the red button at 44 px tall; the nav links are hidden here and remain in the footer. The "· BIDDESK" tag hides under 640 px. H1 44 px at line height 0.92 with one highlight block per line; H2s 32 px; figures 40 px. Buttons stack full width and are at least 44 px tall. Ticker wraps freely with 12 px gaps. Stats stay 2 × 2 with 24 px gaps. Steps, audience cards and the demo list are one column. Photo heights: hero 360 px, demo 320 px. Portal grid 2 × 4. Form fields stack full width. Footer rows stack, copyright and address on separate lines.

Reduced motion is respected by default because nothing animates.

## Staging only

Branch `feature/landing-page`, pull request into `development`, then `development` into `staging`. No pull request into `staging` → `main` until you approve the claims. The page metadata sets `robots: { index: false, follow: false }` when `NEXT_PUBLIC_SITE_NOINDEX=1`, set on the Coolify staging resource and documented in `.env.example`, so a staging crawl never indexes the unapproved copy.

## Files

New: `docs/plans/landing-plan.md`, `public/landing/hero.jpg`, `public/landing/demo.jpg`, `public/landing/footer.jpg`, `src/components/landing/*` (the twelve files above), `src/lib/schemas/demo-request.ts` (+ test), `src/lib/demo-request.ts` (+ test).

Changed: `src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `messages/en.json`, `.env.example`, `docs/ui-ux-guide.md`, `CLAUDE.md`.

Unchanged: `src/app/layout.tsx` (fonts already loaded with the width axis), `src/proxy.ts`, the auth screens, the database.

Dependencies: none.

## Tests

- `demo-request.test.ts` (schema): accepts the sample values, rejects an empty name, a bad email and an over-long trade, and reports the failing path.
- `demo-request.test.ts` (mailto): the link starts with `mailto:` and the address, the subject carries the company, every field value appears decoded in the body, and an ampersand or a newline in a value survives the encoding.
- `messages` check: typecheck already fails on a missing `Landing` key through `global.ts`.
- Manual before the pull request: the frame at 1549 px against the Figma screenshot section by section, 375 px, 200 percent zoom, keyboard pass from the skip link to the footer address, and the guide's checklist with the two contrast items marked as the known exceptions.

Lint, typecheck and tests pass before the pull request.

## Decisions you can override

- Radius tokens go to 0 for the whole app, not only the landing page, because the brief says the tokens match Figma.
- The default button and the input primitives change to the Figma spec, so the sign-in and create-account screens change with them.
- `--signal-press` is derived, since the file has no hover state; hover and pressed states on the landing page use it on the red buttons and an asphalt border on the secondary button.
- The demo address is `demos@beaverbids.ca` until you give another, read from `NEXT_PUBLIC_DEMO_REQUEST_EMAIL`.
- The form submits through the browser's `mailto:` handling; no route handler, no table.
- Nav links hide under 768 px rather than opening a menu, because the file has no menu and the footer carries the same links.
- The header button is 40 px tall on desktop as drawn and 44 px on phones for the touch target.
- `noindex` on staging through an environment variable.
- The "Demo · 1:30" label stays on the demo photo although the play button is out, because it is copy in the file; say if you would rather drop it with the button.

## Out of scope

The video and play button, email sending through SES, storing demo requests, the instant score, French copy, the language switcher, a sign-in link in the header, resolving the portal coverage question, any change to scoring or the API.
