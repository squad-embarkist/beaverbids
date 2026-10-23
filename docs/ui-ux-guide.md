# BeaverBids UI/UX and Brand Guide

Oct 23, 2026 · @CJD

BeaverBids should feel like a sharp, trustworthy tool for Canadian suppliers: loud where it matters (the score), quiet everywhere else. This guide fixes the visual and interaction rules taken from the lo-fi wireframes so design and development build the same product.

## Brand essence

The look is road-sign confident: signal red on asphalt and warm paper, heavy expanded headlines, and monospaced labels that read like data tags. It is built around one idea, the fit score out of 100, and every screen should make that number easy to find and easy to trust.

1. **Score first.** The /100 fit score is the hero of every list and detail view.
2. **Low friction.** Fewer fields, fewer clicks, no jargon between a supplier and their next bid.
3. **Plain and honest.** Show why a tender scored the way it did. Rules set the number; copy only explains it.
4. **Canadian by default.** Canadian spelling, CAD, federal and provincial context, English with French ready.
5. **One accent.** Signal red is for the primary action and the score. If everything is red, nothing is.

## Colour

Three brand colours carry the identity; the rest are neutrals and score bands that support them. The first three come from the wireframes. Rows marked proposed are my additions to cover states the wireframes do not show, so confirm them before they ship.

| Token | Hex | Role | Source |
| --- | --- | --- | --- |
| `--signal` | #D2311F | Primary buttons, the score figure, active nav, links on hover | Wireframes |
| `--asphalt` | #23221F | Body text, headlines, dark panels, primary borders | Wireframes |
| `--paper` | #F3F1EC | Page background | Wireframes |
| `--surface` | #FFFFFF | Cards, inputs, tables sitting on paper | Proposed |
| `--line` | #D9D5CB | Hairline borders and dividers | Proposed |
| `--muted` | #6B675E | Secondary text, helper text, placeholders | Proposed |
| `--signal-press` | #B52A1A | Hover and pressed state for red | Proposed |
| `--band-high` | #2E7D4F | Score 75 to 100 | Proposed |
| `--band-medium` | #B7791F | Score 50 to 74 | Proposed |
| `--band-low` | #8A867C | Score under 50 | Proposed |

**Rules**

- Red is for one primary action per screen and for the score. It is never a body text colour or a large background wash.
- Band colours appear only on score chips and breakdown bars, and always with the number or band word beside them, never colour alone.
- Define every colour as a CSS variable in Tailwind's theme so the dev team never types a raw hex in a component.
- Dark mode is out of the MVP. Build with tokens so it can be added later.

**Contrast.** White on signal red is about 5:1 and asphalt on paper is about 14:1, both above the 4.5:1 minimum for body text. Check the three band colours on white before launch; amber and grey are the likeliest to fail for small text.

## Typography

Two families from the wireframes plus one for reading text. Load all three through `next/font` so there is no layout shift.

| Use | Family | Weight | Notes |
| --- | --- | --- | --- |
| Headlines, the score figure | Archivo Expanded | 700 to 800 | Sentence case, tight leading |
| Labels, tags, table headers, tender numbers | IBM Plex Mono | 400 to 500 | Uppercase for labels, small letter spacing |
| Body, forms, buttons | Archivo (normal width) | 400 to 600 | Proposed. Keeps long text readable |

| Style | Size / line height | Use |
| --- | --- | --- |
| Display | 40 / 44 px | Landing and empty state headlines |
| H1 | 28 / 34 px | Page titles |
| H2 | 20 / 26 px | Card and section titles |
| Body | 16 / 24 px | Default text, inputs |
| Small | 14 / 20 px | Helper text, table cells |
| Label (mono) | 12 / 16 px, uppercase | Tags, column headers, step counters |
| Score | 56 px detail, 32 px list | The /100 figure |

**Rules**

- Never go under 14 px for anything a user must read; 12 px mono is for short uppercase labels only.
- Use mono for data that behaves like a code: tender numbers, closing dates, the "/100".
- Do not set long paragraphs in the expanded headline face.

## Layout and spacing

Use Tailwind's 4 px scale and keep the grid simple: a lot of paper, firm borders, few shadows.

| Property | Rule |
| --- | --- |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64 px |
| Page width | 1200 px max content, 16 px side gutters on phones, 32 px on desktop |
| Grid | 12 columns on desktop, single column under 768 px |
| Radius | 4 px on inputs, buttons and tags; 8 px on cards. No pill shapes except score chips |
| Borders | 1 px `--line` by default; 2 px `--asphalt` for selected and focus states |
| Elevation | None by default. One soft shadow only for menus and dialogs |
| Breakpoints | 640, 768, 1024, 1280 px |

**Responsive behaviour**

- Phone first. The wireframes include mobile opportunities and mobile instant score, so every MVP screen must work at 375 px wide.
- The opportunities table becomes a stack of cards on phones: score on the left, title and closing date to the right.
- Primary actions sit at the bottom of the screen on phones and stay at least 44 px tall.

## Components

Build on shadcn/ui and restyle it with the tokens above, so there is one component set and no one-off styling.

| Component | Spec |
| --- | --- |
| Primary button | Signal red fill, white text, 44 px tall, 4 px radius. One per screen |
| Secondary button | Paper fill, 2 px asphalt border, asphalt text |
| Text button | Asphalt text, underline on hover. Used for Skip and Back |
| Input and select | White fill, 1 px line border, 44 px tall. Focus: 2 px asphalt border plus a visible ring |
| Option card (questionnaire) | White card, 1 px line border; selected: 2 px asphalt border and a check mark |
| Tag | Mono uppercase 12 px, 1 px border, 4 px radius. Used for category, region, closing soon |
| Score chip | Rounded, band colour fill, number in Archivo Expanded. See the next section |
| Table row | 56 px tall, hairline divider, whole row is clickable, keyboard focusable |
| Progress bar | 4 px asphalt track filled in red, with a mono counter such as "STEP 2 OF 5" |
| Top bar | Asphalt background, paper wordmark, red active item. Collapses to a menu on phones |
| Toast | Asphalt fill, paper text, bottom left, auto closes in 5 seconds |

**States every component needs:** default, hover, focus, disabled, loading and error. Focus rings are never removed.

## Score display

The fit score is the signature element of the product, so it follows fixed rules everywhere it appears.

| Band | Range | Colour | Word shown |
| --- | --- | --- | --- |
| High | 75 to 100 | `--band-high` | High fit |
| Medium | 50 to 74 | `--band-medium` | Medium fit |
| Low | under 50 | `--band-low` | Low fit |

**Five-factor breakdown.** On the listing detail, show one horizontal bar per factor with its points out of the maximum, in this fixed order:

| Factor | Max points | Example |
| --- | --- | --- |
| Category match | 40 | 38 |
| Location and eligibility | 20 | 19 |
| Contract size | 15 | 14 |
| Timeline and capacity | 15 | 12 |
| Credentials | 10 | 9 |
| **Total** | **100** | **92** |

**Rules**

- Always show the number and the band word. Colour is a third cue, not the only one.
- Format is "92/100" in Archivo Expanded, with the "/100" in mono at a smaller size.
- Tenders that fail the hard eligibility gate are not shown with a score. They are hidden by default, with a "why hidden" note available.
- The reasons line under the score is short, plain language, and clearly labelled as an explanation. It never changes the number.
- Sort the opportunities list by score, highest first, as the default.

## Screen patterns

The simple MVP has four screens. Everything else in the wireframes is a later phase and keeps the same rules when it is built.

| Screen | Phase | Pattern |
| --- | --- | --- |
| Sign in and create account | MVP | Single centred card on paper, email and password, one red button. No marketing around it |
| Questionnaire (5 steps) | MVP | One question group per screen, large option cards, progress bar on top, Back and Next at the bottom. Answers save on each step so a user can return |
| Opportunities list | MVP | Table on desktop, cards on phones. Score chip first, then title, buyer, region, closing date. Sorted by score |
| Listing detail | MVP | Large score, five-factor bars, short reasons, tender facts, and a link out to the CanadaBuys notice |
| Landing and instant score | Later | Pasted tender link or PDF plus a website. Needs its own build, see the Development Guide |
| Proposal editor | Later | Split view, draft on the left, tender requirements on the right |
| Pipeline board | Later | Columns by stage with draggable cards |
| Mobile instant score | Later | Single column version of the landing flow |

**Questionnaire principles**

- Ask only what feeds the five scoring factors. If an answer does not change a score, do not ask for it.
- Prefer option cards and selects over typing. Use free text only where there is no list.
- Every step has a clear value line, such as "This sets which tenders you see".
- Show the finish state as a result, not a thank-you: send the user straight to their scored list.

**Empty and first-run states.** If the import has not run or nothing matches, the list shows a plain message with the next action, for example "No matches yet. Tenders are updated every morning." Never show a blank table.

## Voice and copy

BeaverBids talks like a capable colleague: direct, calm and specific.

- **Canadian spelling** everywhere: colour, centre, organization, licence (noun), cheque.
- **No em dashes** in any copy. Use a comma, a colon or a new sentence.
- Sentence case for headings and buttons. Buttons start with a verb: "Save and continue", "View tender".
- Dates as "Oct 23, 2026" in the interface; money in CAD with the symbol, such as "$250,000". Say "CAD" only when a currency is unclear.
- Name the buyer and the closing date before anything else about a tender.
- Say what happened and what to do next. Avoid blame: "We could not load tenders. Try again in a minute."

| State | Copy pattern |
| --- | --- |
| Loading | Skeleton rows that match the table, never a lone spinner |
| Empty | One sentence on why, one action |
| Error | What failed, what the user can do, no codes on screen |
| Success | A short toast, then move the user forward |

All strings live in translation files from day one with next-intl. English ships first; French is a translation job later, not a rewrite. Leave room for French text, which runs about 20 percent longer.

## Accessibility and handoff checklist

Target WCAG 2.2 AA. These checks belong in each pull request that touches the interface.

- [ ] Text contrast is at least 4.5:1; large text and icons at least 3:1
- [ ] Every control works by keyboard, with a visible focus ring
- [ ] Touch targets are at least 44 px
- [ ] Score and bands are never conveyed by colour alone
- [ ] Forms have visible labels, error text tied to the field, and no placeholder-only labels
- [ ] Each page has one H1 and a logical heading order
- [ ] Questionnaire progress is announced to screen readers
- [ ] Layout holds at 375 px wide and at 200 percent zoom
- [ ] Motion is minimal and respects reduced motion settings
- [ ] All colours and type come from tokens, no raw hex values in components
- [ ] Copy uses Canadian spelling, no em dashes, and lives in translation files

**Open items for design to confirm:** the proposed neutral and band colours, the body typeface, and the exact five questionnaire steps against the final wireframes.
