# Field and button states: build plan

Nov 2, 2026 · Status: approved Nov 2 and built on `feature/form-states`

Source: Figma file "Beaver Bids UI", page "Every state, once" (node 34:7640). It is the handoff reference for every state a text field, a button or a banner can be in. The five screens in that file only show the resting state, so this page is where the hover, focus, error, disabled and in-progress rules live. The ask is to apply those rules to every field and button style in the app.

Done when every field and button in the app renders the states exactly as that page draws them, the UI guide records the same rules, and lint, typecheck, unit tests and the Playwright accessibility suite pass.

## What the page fixes

**Text fields** (label above in mono uppercase, 11 px, tracking 18 percent, colour #4F4C47)

| State | Rule from the page |
| --- | --- |
| Default | 1 px #4F4C47 border on a #FAF9F6 fill, 14 px padding, square. Placeholder in #8C8880 |
| Focus | 2 px asphalt outline with a 3 px offset. "Never remove the ring" |
| Filled | Same as default. Value in asphalt, not grey |
| Error | 2 px signal border. Error text under the field in asphalt, 13 px, with an 8 px signal square before it |
| Disabled | #DEDBD3 fill, 1 px #B9B4AB hairline border, value in #4F4C47, label in #8C8880. "Used while a request is in flight" |
| Password | The border sits on a wrapper; a mono SHOW / HIDE toggle on the right behind a #B9B4AB left hairline |

**Buttons**

| State | Rule from the page |
| --- | --- |
| Primary | Signal fill, white uppercase label. "One per screen. 56 px on forms, 48 px in a nav bar" |
| Primary hover | Darkens to #B32717. "No lift, no shadow, no transform" |
| Working | Hover red, a 14 px square white spinner (2 px border, 0.8 s spin) before the label, and the label changes to the verb in progress ("Creating your account") |
| Disabled | #DEDBD3 fill, 1 px #B9B4AB border, #8C8880 label. "Only for a cooldown, never to police a half-filled form" |
| Secondary | 1 px asphalt border, asphalt label, no fill. Fills with #DEDBD3 on hover |
| Text link | Bold, underlined on hover, turns signal |

**Rules that are easy to miss**: errors sit under their field, never only at the top; a failed log in never says which half was wrong; validate on blur and on submit, never on every keystroke; resend has a 60 second cooldown with the countdown shown (no resend exists in the MVP, nothing to build); every field keeps its label visible; real autocomplete values on every input.

The page also draws four banners (error on signal, success on asphalt, quiet note on stone-light, link expired with a 2 px signal border and a small primary). They are not fields or buttons, but the form-level alert the sign in, create account and questionnaire forms show today is a different, rounded style, so the plan covers it in step 6 as a recommended extra.

## Where the page disagrees with what is built

The current components follow docs/ui-ux-guide.md and the landing Figma frame 1:957. The new page changes some of those values. Each row is a decision; the plan builds the recommendation unless told otherwise.

| # | Topic | Built today | Figma 34:7640 | Recommendation |
| --- | --- | --- | --- | --- |
| 1 | Primary label colour | Asphalt on signal (3.2:1, a documented contrast exception) | White on signal (5.0:1) | White everywhere, including the landing page buttons. It fixes the exception, so the e2e contrast carve-out for `.bg-signal` goes away |
| 2 | Hover red | #B8251A (`--signal-press`, marked proposed in the guide) | #B32717 | #B32717 |
| 3 | Field fill and border | Paper fill, 1 px muted border at 40 percent | #FAF9F6 fill, 1 px #4F4C47 border | Figma values. The landing demo form uses the same Input, so it shifts from paper to #FAF9F6 (a near-identical tint) |
| 4 | Field height and padding | 50 px, 16 px padding (guide) | 46 px, 14 px padding | Keep 50 px and 16 px. The request is about states; the guide's geometry stays and the page's 46 px is noted as unconfirmed |
| 5 | Field label | Three styles: auth Label (sans 14 px), questionnaire FieldLabel (sans bold uppercase), filters `label-mono` (mono, #7C7970) | One style: mono 11 px uppercase, #4F4C47 | One shared FieldLabel in mono 11 px uppercase, #4F4C47 (7.6:1 on paper). `label-mono` also moves to #4F4C47, which lifts the "muted label" contrast exception |
| 6 | Button label type | Archivo condensed bold 16 px, 2.5 percent tracking (guide, landing) | Archivo normal width bold 13 px, 6 percent tracking | Keep the condensed face. It is a brand rule in the guide and the landing is built on it |
| 7 | Secondary border | Asphalt at 40 percent | Asphalt at 100 percent, stone-light fill on hover | Figma values |
| 8 | Disabled look | 50 percent opacity (buttons), 60 percent opacity plus stone-light (fields) | Solid stone-light fill, hairline border, grey text, no opacity | Figma values, no opacity anywhere |
| 9 | Error look | Signal border plus a signal ring; error text in signal | 2 px signal border, no ring; error text in asphalt with an 8 px signal square | Figma values |
| 10 | Focus | 2 px asphalt outline, no offset, plus a ring at 20 percent | 2 px asphalt outline, 3 px offset, no ring | Figma values on fields, buttons and option cards; the global `:focus-visible` rule gets the 3 px offset too |
| 11 | In-flight buttons | `disabled` plus "Saving" on the questionnaire; `disabled` with no label change on sign in and create account | Working state: hover red, spinner, in-progress verb, never the disabled look | A `busy` prop on Button (see step 2) |
| 12 | Validation timing | React Hook Form defaults: on submit, then on every change | On blur and on submit | `mode: "onBlur"` and `reValidateMode: "onBlur"` on the five step forms. Auth and demo forms already validate on submit only |

Header button height stays 40 px (44 px on phones) as the guide and the landing frame set it; the page's "48 px in a nav bar" is noted in the guide as unconfirmed, like row 4.

## Steps

### 1. Tokens (`src/app/globals.css`, `docs/ui-ux-guide.md`)

New colour tokens, defined once in `:root` and exposed through `@theme inline`:

| Token | Hex | Role |
| --- | --- | --- |
| `--ink-strong` | #4F4C47 | Field labels, help text, field borders, the value of a disabled field |
| `--ink-soft` | #8C8880 | Placeholders, disabled labels, disabled button text |
| `--hairline` | #B9B4AB | Disabled borders, the password toggle divider, section rules |
| `--field` | #FAF9F6 | Field fill |

`--signal-press` becomes #B32717. A `spin-square` keyframe (0.8 s, linear) for the working spinner; the existing reduced-motion block already stops it. The `:focus-visible` base rule gains `outline-offset: 3px`. A `text-link` utility (bold, hover underline, hover signal) for inline links such as "Already have an account? Sign in". The guide's Colour and Components tables are updated to match, the two contrast exceptions are removed, and `e2e/accessibility.spec.ts` drops them from `KNOWN_CONTRAST_EXCEPTIONS` (the check then has to pass with no carve-outs).

### 2. Button (`src/components/ui/button.tsx`, `button-link.tsx`)

- Base: focus is `outline-2 outline-asphalt outline-offset-3`, no ring. Disabled: `bg-stone-light border-hairline text-ink-soft`, no opacity.
- `default` and `destructive`: `bg-signal text-white hover:bg-signal-press active:bg-signal-press`.
- `secondary`: `border-asphalt text-asphalt hover:bg-stone-light`.
- `text`: `text-asphalt hover:underline hover:text-signal`. `link` keeps signal and gains the underline on hover.
- New `busy?: boolean` prop. When true the button renders the 14 px square spinner before its children, sets `aria-busy`, and is `disabled` with Base UI's `focusableWhenDisabled` so it keeps focus and reads as unavailable without the disabled look (`aria-busy` classes come after `disabled` classes so they win: `aria-busy:bg-signal-press aria-busy:text-white aria-busy:border-transparent`). Verified against the Base UI Button docs at build time.
- The caller swaps the label for the verb in progress; the component does not guess it.
- `ButtonLink` keeps the shared variants; "Show more" in `load-more.tsx` passes the same busy look through `aria-busy` (it is a link, so no `disabled`).
- The two call sites that override secondary (the filters Apply button, the header Sign out) keep their overrides.

### 3. Fields (`input.tsx`, `textarea.tsx`, `native-select.tsx`, `select.tsx`, new `field.tsx`, new `password-input.tsx`)

- Input, Textarea, NativeSelect: `bg-field border-ink-strong text-asphalt placeholder:text-ink-soft`; focus `outline-2 outline-asphalt outline-offset-3`, no ring; invalid `border-signal shadow-[inset_0_0_0_1px_var(--signal)]` (a 2 px edge with no layout shift); disabled `bg-stone-light border-hairline text-ink-strong`, no opacity. SelectTrigger (unused today) gets the same classes so the first use matches.
- New `src/components/ui/field.tsx` with `FieldLabel` (mono 11 px uppercase, `text-ink-strong`, `peer-disabled` and `group-disabled` to `text-ink-soft`), `FieldHint` (13 px, `text-ink-strong`) and `FieldError` (13 px asphalt, `role="alert"`, the 8 px signal square as a `before` pseudo element so it is decorative). The auth `FormField`, the questionnaire `fields.tsx` and the landing `demo-request-form.tsx` all switch to these three, so one error style exists. The questionnaire module keeps re-exporting them so its forms do not change imports.
- New `PasswordInput`: a wrapper that carries the border and the focus outline (`focus-within`), the Input inside with no border, and a mono SHOW / HIDE toggle (`type="button"`, `aria-pressed`, `aria-controls` the input, 44 px tall) behind a left hairline. Messages `Auth.password.show` and `Auth.password.hide`. Used by sign in and create account.
- OptionCard: focus offset 3 px; a disabled card takes the stone-light fill and hairline border.
- `label-mono` moves to `text-ink-strong`.

### 4. Forms

- Sign in and create account: `busy={pending}` on the submit button with new messages `Auth.signIn.working` ("Signing you in") and `Auth.createAccount.working` ("Creating your account"); the password field becomes `PasswordInput`; the inline "Create an account" and "Sign in" links use `text-link`.
- Questionnaire `step-form.tsx`: the primary button takes `busy={pending}` and keeps the existing "Saving" label; Back, Skip and Save and finish later stay as they are but are no longer `disabled` while saving (the page says disabled is for cooldowns), they are `aria-disabled` and ignore clicks while a save is in flight. The five forms set `mode: "onBlur"` and `reValidateMode: "onBlur"`.
- `load-more.tsx`: the busy look while loading, label already "Loading more".

### 5. Messages and docs

`messages/en.json` gains the four keys above. CLAUDE.md gets one line on `busy`, the shared field components and the password toggle. The guide's Components table lists every state per component (default, hover, focus, disabled, working, error).

### 6. Banner (recommended extra, say no to drop it)

New `src/components/ui/banner.tsx` with `variant: "error" | "success" | "note" | "attention"` exactly as the page draws them (signal fill with white text and the warning icon; asphalt fill with paper text and the check; stone-light with the 10 px square; #FAF9F6 with a 2 px signal border and an optional action slot). The form-level alerts in sign in, create account and the questionnaire use the error variant, which also removes their `rounded-lg`, the one rounded corner in the app outside score chips. Icons from `lucide-react`, not the Figma SVG exports.

## Files

| File | Change |
| --- | --- |
| `src/app/globals.css` | Tokens, spinner keyframe, focus offset, `text-link` |
| `src/components/ui/button.tsx`, `button-link.tsx` | Variants, states, `busy` |
| `src/components/ui/input.tsx`, `textarea.tsx`, `native-select.tsx`, `select.tsx` | Field states |
| `src/components/ui/field.tsx`, `password-input.tsx`, `banner.tsx` | New |
| `src/components/auth/form-field.tsx`, `sign-in-form.tsx`, `create-account-form.tsx`, `src/app/(auth)/sign-in/page.tsx`, `create-account/page.tsx` | Shared field parts, busy, password toggle, text links |
| `src/components/questionnaire/fields.tsx`, `step-form.tsx`, `forms/*.tsx` | Shared field parts, busy, blur validation |
| `src/components/landing/demo-request-form.tsx` | Shared field parts |
| `src/components/opportunities/load-more.tsx` | Busy look |
| `messages/en.json` | Four keys |
| `docs/ui-ux-guide.md`, `CLAUDE.md`, `e2e/accessibility.spec.ts` | Rules, exceptions removed |

## Verification

- `npm run lint`, `npm run typecheck` (also checks the new message keys), `npm test`.
- `npm run e2e`: the accessibility suite with no contrast exceptions left, and the onboarding flow, which clicks through every step button.
- A manual pass on the five screens at desktop and 375 px: tab through each form to see the 3 px offset outline, submit an empty create account form to see the error edge and the squared error line, toggle SHOW / HIDE, and watch the working state on a slow save.

## Not in this plan

Instant score, resend and cooldown (no email in the MVP), French copy, dark mode, the field height and nav button height changes (rows 4 and the header note, parked until design confirms them against the guide).
