# Account flow: build plan

Nov 2, 2026 · Status: approved Nov 2, 2026 with the decisions below. Slice 1 (email plumbing) and the sign-up slice (plan slices 2, 3 and 4 below, built together on Nov 2, 2026 as the second pull request) are on branch feature/account-flow-email

Source: Figma file "Beaver Bids UI" (`as6B9wxEHtLPQEHXbGopGN`), seven frames: Sign Up (30:135), Log in (32:505), Check inbox (32:1861), Forget Password (32:1377), set new password (34:3086), (email) confirm address (34:6784), (email) reset password (34:7183). States for every field, button and banner come from the page "Every state, once" (34:7640, built in docs/plans/form-states-plan.md).

Scope: email confirmation on sign-up, password reset by email, the restyled sign-in and create-account screens, the two transactional emails, and the sending infrastructure they need. This is the first time the product sends email. The MVP decision "the MVP sends no email" in CLAUDE.md and docs/development-guide.md (M0 row) changes with this plan and both documents are updated in the last slice.

Done when: a new visitor creates an account, confirms it from the email, lands on the questionnaire, can log out and back in, can reset a forgotten password from the email and is logged in afterwards with every other session ended; an unconfirmed account cannot log in; every form, link, error and empty state renders as drawn; emails arrive in the local mail catcher on a laptop and through TurboSMTP on staging; lint, typecheck, unit, integration and Playwright suites pass.

Slices are built in order, one pull request each.

## Decisions (approved Nov 2, 2026)

| # | Question | Decision |
| --- | --- | --- |
| D1 | "Log in" (drawn on every frame) or "Sign in" (built, guide, CLAUDE.md)? | **"Log in", as drawn, one word everywhere** (corrected Nov 2, 2026). The displayed text changes on the auth screens, in the header ("Log out") and in the emails; the existing key names `Auth.signIn`, `Common.signIn` and `Nav.signOut` stay. The guide and CLAUDE.md are updated in slice 6 |
| D2 | Password minimum 8 (built) or 12 (Figma)? | **12.** The "IT NEEDS TO BE" checklist on Set new password reads "Twelve characters or more", and both password fields carry the placeholder "At least 12 characters", so the Figma itself says 12. Existing passwords keep working: Better Auth checks length on sign-up and reset only |
| D3 | The Sign Up frame has a "Company website" field with the promise "We read it to fill in most of your setup answers" | **Dropped.** The basics step already asks for the website and nothing reads it yet |
| D4 | The Log in panel shows "New since Tuesday 24, Scored 80 or above 3, Closing this week 5", which cannot be the viewer's numbers before log-in | **Approved:** two real global counts from the tender table (new since the last import, closing within 7 days), "Scored 80 or above" dropped, cached for an hour with `use cache` |
| D5 | Claims on the panels: "SIX PORTALS · READ NIGHTLY · ALL CANADIAN", "Free while in beta", "Card: Not needed", "Same account for your whole team" | **Approved:** kept in messages as drawn and flagged. Section 8, item 24 adds the pre-launch check that every claim is true |
| D6 | Email provider and transport | **nodemailer for every environment, no SES.** Laptop: Mailpit. CI and Playwright: the file transport. Staging and production: SMTP through environment variables (host, port, username, password, sender address), provider TurboSMTP. The worker refuses to start in production when any of them is missing. Section 5 |
| D7 | What happens to accounts that never confirm? | **Approved:** a weekly worker job deletes unconfirmed accounts with no company profile whose `createdAt` is more than 7 days old (the cutoff), along with expired `Verification` rows. It is what makes the drawn email line "Nothing is created until the link is used" true |
| D8 | Sender and support addresses | `EMAIL_FROM` (drawn as `hello@beaverbids.ca`) and `SUPPORT_EMAIL` (drawn as `support@beaverbids.ca`) as environment variables |
| D9 | Email must be confirmed before sign-in; no social sign-in | **Approved as planned** (`requireEmailVerification: true`, email and password only) |
| D10 | Backfill existing accounts as confirmed in the migration | **Approved** (section 4) |
| D11 | Custom rate limiter in `src/lib` on Better Auth's `rateLimit` table | **Approved** (section 6) |
| D12 | The 23 unclear or missing items in section 8 | **Defaults as proposed, and nothing is added that the Figma does not draw: no new screens, no new steps, no third email.** Section 8 now carries the decision per item; the three proposals that would have added something (a Check inbox variant for the reset link, a standalone expired-link page, an "existing account" email) are replaced by banners on the drawn screens and by resending the drawn confirmation email |

## 1. The seven frames

All five screens share one layout: a 315 px side panel on the left (asphalt on Sign Up and Set new password, stone on the other three) with a 6 px signal rule on its left edge, the beaver logo and wordmark at the top, a 48 px expanded headline with one highlighted line, a paragraph, a boxed fact or sample card, and three mono "LABEL: value" rows along the bottom. The right side is paper with a 460 px form centred vertically. Fields are mono uppercase labels over 46 px inputs (the guide keeps 50 px). Every frame is 1040 px wide and desktop only.

### 1.1 Sign Up (30:135) → `/create-account`

Side panel (asphalt): logo, "EVERY PORTAL. ONE RANKED LIST." (second line highlighted), paragraph, a sample score card (84 /100, "IT Managed Services and Cloud Support", "CITY OF SAMPLE, ON · CLOSES IN 9 DAYS"), three rows: SETUP / COST / CARD.

| Field | Type | Label | Placeholder | Help | Autocomplete |
| --- | --- | --- | --- | --- | --- |
| Full name | text | FULL NAME | Jordan Pratt | | `name` |
| Work email | email | WORK EMAIL | jordan@prattsons.ca | | `email` |
| Password | password with SHOW toggle | PASSWORD | At least 12 characters | Twelve characters or more. A short sentence beats a clever word. | `new-password` |

The drawn "Company website" field (placeholder "prattsons.ca", help "We read it to fill in most of your setup answers for you. Skip it and you type them yourself.") is left out (D3).

Buttons and links: primary "Create account" (working label "Creating your account"); inline links "Terms of Service" and "Privacy Policy" in the consent line (no pages exist yet, see section 8); text link "Log in" after "Already have an account?".

States: field errors under each field (name required, email invalid, password under 12 or over 128); form error banner for an unexpected failure; working button. There is no "email already taken" state any more: with confirmation on, Better Auth answers a duplicate address exactly like a new one, and the person lands on Check inbox (section 6). Success: redirect to `/check-inbox`.

### 1.2 Log in (32:505) → `/sign-in`

Side panel (stone): logo, "WELCOME BACK." ("BACK." highlighted), paragraph, a "WAITING FOR YOU" card with three count rows (see D4), bottom line "SIX PORTALS · READ NIGHTLY · ALL CANADIAN".

| Field | Type | Label | Placeholder | Autocomplete |
| --- | --- | --- | --- | --- |
| Work email | email | WORK EMAIL | jordan@prattsons.ca | `email` |
| Password | password with SHOW toggle, "FORGOT IT?" mono link on the label row | PASSWORD | Your password | `current-password` |
| Keep me logged in on this computer | checkbox, checked by default | | | |

Buttons and links: primary "Log in" (working "Logging you in"); "FORGOT IT?" → `/forgot-password`; "Create an account" after "New here?".

States: field errors (email invalid, password required); error banner "That email and password do not match" that never says which half was wrong; unconfirmed account → redirect to `/check-inbox` with a fresh confirmation email sent; too many attempts → error banner with the wait. Success: the scored list or the next questionnaire step, as today.

### 1.3 Check inbox (32:1861) → `/check-inbox`

Side panel (stone): logo, "ONE CLICK AND YOU ARE IN." ("AND YOU ARE IN." highlighted), paragraph, rows FROM / SUBJECT / EXPIRES.

Right: 56 px signal envelope icon, "CHECK YOUR INBOX.", paragraph with the address in bold, a "NOTHING YET?" note card with two square bullets, a secondary "Send it again" button (drawn in the disabled cooldown look, grey text, hairline border) beside the mono countdown "AVAILABLE IN 0:45", then two text links: "Change your email address" and "support@beaverbids.ca".

States: cooldown (button disabled, countdown ticking from the server's retry-after value, then enabled); sent again (success banner "Sent. Give it a minute."); resend limit reached (note banner with the wait); no pending address (visitor opened the URL cold) → the page shows the same copy without the address and an email field to resend to; expired or invalid confirmation link (`?error=link`, section 3) → the attention banner from the states page above the same copy, with "Send it again" as the action. The address comes from a short-lived cookie set by the sign-up and sign-in actions, never from the URL. A successful click on the email link never shows this page: Better Auth confirms, signs the person in and the `/verify-email` route sends them to the questionnaire (section 3). This screen is used for the confirmation email only; the reset flow stays on the Forgot password screen (section 8, item 2).

### 1.4 Forget Password (32:1377) → `/forgot-password`

Side panel (stone): logo, "IT HAPPENS." ("HAPPENS." highlighted), paragraph, rows LINK / USES / STUCK.

| Field | Type | Label | Placeholder | Autocomplete |
| --- | --- | --- | --- | --- |
| Work email | email | WORK EMAIL | jordan@prattsons.ca | `email` |

Buttons and links: eyebrow "PASSWORD RESET", primary "Send reset link" (working "Sending your link"), a stone-light note with a 10 px ink-strong square ("We show this same message whether or not the address has an account..."), text link "Back to log in".

States: email invalid under the field; after submit, the same page shows the success banner from the states page above the form (same wording for every address, the form stays so a second submit is the resend, under the cooldown from section 6); rate limit reached (note banner with the wait). The "whether or not" note stays visible in both states. No separate sent screen (section 8, item 2).

### 1.5 set new password (34:3086) → `/reset-password?token=…`

Side panel (asphalt): logo, "LAST STEP." ("STEP." highlighted), paragraph, a "SIGNED IN AS" card with the address and "Not you? Close this tab and the link dies unused.", bottom row "LINK: Expires in 52 min" in signal.

| Field | Type | Label | Placeholder | Autocomplete |
| --- | --- | --- | --- | --- |
| New password | password with SHOW toggle | NEW PASSWORD | At least 12 characters | `new-password` |
| Type it again | password, no toggle | TYPE IT AGAIN | The same password | `new-password` |

Checklist card "IT NEEDS TO BE" with three rows: "Twelve characters or more" (check icon when met), "Different from your last password" (circle), "Both boxes matching" (circle). The first and third tick live in the browser; the second can only be known after submit, so it ticks or errors from the server answer.

Buttons: primary "Save and log me in" (working "Saving your password"); mono footnote "Saving this signs out every other device using the old password."

States: mismatch and too-short errors under the fields; "same as your last password" error under the first field; expired or used link (`?error=INVALID_TOKEN`) → the attention banner from the states page ("That link has expired" with a small primary "Send me a new one" → `/forgot-password`); no token → same banner. Success: signed in, every other session ended, redirect to the scored list. The expired state is a banner on this screen, not a page of its own.

### 1.6 (email) confirm address (34:6784)

600 px email: asphalt header with logo and wordmark, 6 px signal rule, eyebrow "NEW ACCOUNT", heading "CONFIRM YOUR EMAIL.", "Hello Jordan,", one paragraph, signal button "Confirm my email", a stone-light "BUTTON NOT WORKING?" box with the plain URL, a rule, two small paragraphs (expiry in bold, the "did not sign up" line), asphalt footer with wordmark, tagline, placeholder address and copyright.

### 1.7 (email) reset password (34:7183)

Same shell. Eyebrow "PASSWORD RESET", heading "SET A NEW PASSWORD.", greeting, paragraph, button "Set a new password", URL box, expiry line (60 minutes, signs out every other device), the "did not ask" paragraph with the support address, footer with a "security email" line instead of the tagline.

### 1.8 Copy, ready for messages/en.json

Everything below is as drawn except the dropped website field (D3). Key names follow the existing code (`Auth.signIn`, `Common.signIn`, `Nav.signOut`) even where the displayed text says "Log in" (D1). Keys are proposed. `{email}`, `{name}`, `{minutes}`, `{seconds}`, `{count}` are ICU parameters. Headline highlight lines are separate keys so the signal block can wrap them.

**Shared side panel** (`Auth.side`)

| Key | Text |
| --- | --- |
| brand | BEAVERBIDS |
| signUp.title | EVERY PORTAL. |
| signUp.titleHighlight | ONE RANKED LIST. |
| signUp.lead | Answer five questions about your shop. Tomorrow morning the tenders worth your week are at the top of one list, each scored out of 100 with the reason attached. |
| signUp.sample.score | 84 |
| signUp.sample.outOf | /100 |
| signUp.sample.title | IT Managed Services and Cloud Support |
| signUp.sample.meta | CITY OF SAMPLE, ON · CLOSES IN 9 DAYS |
| signUp.facts.setup | SETUP: |
| signUp.facts.setupValue | About 5 minutes |
| signUp.facts.cost | COST: |
| signUp.facts.costValue | Free while in beta |
| signUp.facts.card | CARD: |
| signUp.facts.cardValue | Not needed |
| signIn.title | WELCOME |
| signIn.titleHighlight | BACK. |
| signIn.lead | We kept reading the portals while you were out. Your list is sorted and the ones closing first are at the top. |
| signIn.waiting.label | WAITING FOR YOU |
| signIn.waiting.newSince | New since {day} |
| signIn.waiting.scoredHigh | Scored 80 or above (drawn; not rendered, D4) |
| signIn.waiting.closingThisWeek | Closing this week |
| signIn.footer | SIX PORTALS · READ NIGHTLY · ALL CANADIAN |
| checkInbox.title | ONE CLICK |
| checkInbox.titleHighlight | AND YOU ARE IN. |
| checkInbox.lead | The link lands in a few seconds. Leave this tab open, or close it and use the one in the email. Either works. |
| checkInbox.facts.from | FROM: |
| checkInbox.facts.subject | SUBJECT: |
| checkInbox.facts.subjectValue | Confirm your email |
| checkInbox.facts.expires | EXPIRES: |
| checkInbox.facts.expiresValue | In 24 hours |
| forgot.title | IT |
| forgot.titleHighlight | HAPPENS. |
| forgot.lead | One email, one link, back in two minutes. Your list and your answers are exactly where you left them. |
| forgot.facts.link | LINK: |
| forgot.facts.linkValue | Good for 60 minutes |
| forgot.facts.uses | USES: |
| forgot.facts.usesValue | One, then it dies |
| forgot.facts.stuck | STUCK: |
| reset.title | LAST |
| reset.titleHighlight | STEP. |
| reset.lead | Pick something you will actually remember. We will log you in straight after and drop you back on your list. |
| reset.signedInAs | SIGNED IN AS |
| reset.notYou | Not you? Close this tab and the link dies unused. |
| reset.facts.link | LINK: |
| reset.facts.linkValue | Expires in {minutes} min |

**Create account** (`Auth.createAccount`, replaces the current keys)

| Key | Text |
| --- | --- |
| eyebrow | STEP 1 OF 2 · YOUR ACCOUNT |
| title | CREATE YOUR ACCOUNT. |
| lead | Next comes the five-question setup. No sales call, and nothing to cancel. |
| name | FULL NAME |
| namePlaceholder | Jordan Pratt |
| email | WORK EMAIL |
| emailPlaceholder | jordan@prattsons.ca |
| password | PASSWORD |
| passwordPlaceholder | At least 12 characters |
| passwordHint | Twelve characters or more. A short sentence beats a clever word. |
| submit | Create account |
| working | Creating your account |
| consent | By creating an account you agree to the <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>. We never sell your profile or show it to other bidders. |
| haveAccount | Already have an account? |
| signIn | Log in |

**Log in** (`Auth.signIn`, key name kept, displayed text "Log in")

| Key | Text |
| --- | --- |
| title | LOG IN. |
| lead | Same account for your whole team. |
| email | WORK EMAIL |
| emailPlaceholder | jordan@prattsons.ca |
| password | PASSWORD |
| passwordPlaceholder | Your password |
| forgot | FORGOT IT? |
| rememberMe | Keep me logged in on this computer |
| submit | Log in |
| working | Logging you in |
| newHere | New here? |
| createAccount | Create an account |

**Check inbox** (`Auth.checkInbox`)

| Key | Text |
| --- | --- |
| title | CHECK YOUR INBOX. |
| lead | We sent a link to <strong>{email}</strong>. Open it and we will take you straight to the five-question setup. |
| leadNoEmail | We sent a link to your address. Open it and we will take you straight to the five-question setup. |
| nothingYet | NOTHING YET? |
| tipWait | Give it a minute. Work inboxes are slower than personal ones. |
| tipSpam | Look in spam or junk, then mark us as safe so the tender digests land. |
| resend | Send it again |
| resendWorking | Sending it again |
| availableIn | AVAILABLE IN {time} |
| resent | Sent. Give it a minute. |
| wrongEmail | Typed it wrong? |
| changeEmail | Change your email address |
| stillStuck | Still stuck? |
| linkExpired | That link has expired or was already used. Send yourself a new one. (not drawn; the attention banner, section 8 item 3) |

**Forgot password** (`Auth.forgotPassword`)

| Key | Text |
| --- | --- |
| eyebrow | PASSWORD RESET |
| title | SEND ME A LINK. |
| lead | Type the email you signed up with. If we have an account for it, a reset link is on its way. |
| email | WORK EMAIL |
| emailPlaceholder | jordan@prattsons.ca |
| submit | Send reset link |
| working | Sending your link |
| sameMessage | We show this same message whether or not the address has an account. That keeps anyone from using this page to find out who banks with us. |
| remembered | Remembered it? |
| backToLogIn | Back to log in |
| sent | If we have an account for {email}, a reset link is on its way. (not drawn; the success banner) |

**Reset password** (`Auth.resetPassword`)

| Key | Text |
| --- | --- |
| eyebrow | PASSWORD RESET |
| title | SET A NEW PASSWORD. |
| password | NEW PASSWORD |
| passwordPlaceholder | At least 12 characters |
| confirm | TYPE IT AGAIN |
| confirmPlaceholder | The same password |
| needs | IT NEEDS TO BE |
| needsLength | Twelve characters or more |
| needsDifferent | Different from your last password |
| needsMatch | Both boxes matching |
| submit | Save and log me in |
| working | Saving your password |
| signsOut | Saving this signs out every other device using the old password. |
| expiredTitle | That link has expired or was already used. (not drawn) |
| expiredAction | Send me a new one (not drawn) |

**Errors** (`Auth.errors`, additions and changes)

| Key | Text |
| --- | --- |
| passwordTooShort | Use at least 12 characters. (was 8) |
| passwordMismatch | The two passwords do not match. |
| passwordSameAsOld | Choose a password you have not used here before. |
| emailNotVerified | Confirm your email first. We just sent you a new link. (shown on Check inbox as a banner, not on the sign-in form) |
| tooManyAttempts | Too many tries. Wait {minutes} minutes and try again. |
| linkInvalid | That link is not valid. Ask for a new one. |
| emailTaken | removed: a duplicate address is never reported (section 6) |

**Header**: `Nav.signOut` displays "Log out" and `Common.signIn` displays "Log in"; the key names stay (D1).

**Confirm email** (`Email.confirm`)

| Key | Text |
| --- | --- |
| subject | Confirm your email |
| preheader | One click and your five-question setup begins. (not drawn, the hidden preview line) |
| eyebrow | NEW ACCOUNT |
| title | CONFIRM YOUR EMAIL. |
| greeting | Hello {name}, |
| body | Someone created a BeaverBids account with this address. Confirm it and we will take you straight to the five-question setup. About five minutes, and your first scored tenders land tomorrow morning. |
| button | Confirm my email |
| buttonNotWorking | BUTTON NOT WORKING? |
| expiresBold | This link expires in 24 hours |
| expiresRest | and works once. If it has run out, ask for a new one from the log in page. |
| ignore | If you did not sign up for BeaverBids, ignore this email. Nothing is created until the link is used. |

**Reset password email** (`Email.reset`)

| Key | Text |
| --- | --- |
| subject | Reset your BeaverBids password (not drawn) |
| preheader | A one-time link, good for 60 minutes. (not drawn) |
| eyebrow | PASSWORD RESET |
| title | SET A NEW PASSWORD. |
| greeting | Hello {name}, |
| body | Someone asked to reset the password on the BeaverBids account for this address. If that was you, set a new one here. Your tenders, answers and saved list are untouched. |
| button | Set a new password |
| buttonNotWorking | BUTTON NOT WORKING? |
| expiresBold | This link expires in 60 minutes |
| expiresRest | and works once. Saving a new password signs out every other device. |
| ignore | If you did not ask for this, ignore the email and your password stays exactly as it is. Nobody can get in with this link alone. If it keeps happening, tell us at {supportEmail}. |
| securityNote | This is a security email about your account, so it is sent whatever your notification settings say. |

**Email footer** (`Email.footer`)

| Key | Text |
| --- | --- |
| brand | BEAVERBIDS |
| tagline | Canadian government tenders, filtered to your shop and delivered before they close. |
| address | {postalAddress} (drawn as "[STREET ADDRESS], [CITY], CANADA") |
| copyright | © {year} BEAVERBIDS · MADE IN CANADA (drawn with an em dash; the rules forbid it, so a middle dot) |

Plain-text versions of both emails reuse the same keys in order, with the URL on its own line.

## 2. What is reused and what is new

### Reused as is

| Piece | Where |
| --- | --- |
| `Button` (primary, secondary, `busy`, cooldown disabled look) | all five screens; the cooldown disabled state is exactly the one use the guide allows |
| `ButtonLink` | "Send me a new one" on the expired-link banner |
| `FieldLabel`, `FieldHint`, `FieldError`, `fieldDescribedBy`, `Input`, `PasswordInput`, `FormField` | every field. The second password field on Set new password is a plain `Input type="password"` |
| `Banner` (error, success, note, attention with `action`) | form errors, "sent" states, the note on Forgot password, the expired-link state |
| `BrandLockup` (light and dark tones, `lg` size) | the top of every side panel and both email headers (email gets a static copy, see below) |
| `highlight` utility | the second headline line on every side panel |
| `text-link` utility | the text links under the rule on every screen |
| Tokens: signal, signal-press, asphalt, paper, stone, stone-light, field, ink-strong, ink-soft, hairline, line | everything drawn in those colours |
| Type tokens: `text-section` (48 px headline), `text-mono-xs` (11 px label), `text-tag` (10 px card label), `text-mono-md` (13 px fact rows), `text-body-15`, `text-help`, `text-wordmark-lg` | matches the frames within a pixel |
| `Auth.password.show` / `hide` | the toggle |
| `src/lib/schemas/auth.ts` (`email`, `signInSchema`, `createAccountSchema`) | extended, not replaced |
| Server actions with `useActionState` (`src/app/(auth)/actions.ts`) | same pattern for the three new forms, so every form works without JavaScript |
| `src/lib/boss.ts` (send-only pg-boss) and `src/lib/queues.ts` | the web app enqueues emails the same way it enqueues rescoring |
| `log`, Sentry, `apiError` | unchanged |

### Changed

| Piece | Change |
| --- | --- |
| `src/app/(auth)/layout.tsx` | from a centred card to the two-column layout: `AuthShell` with a `panel` slot. Under 1024 px the panel becomes a top band (lockup only, headline and facts hidden); the form takes the full width with 16 px gutters at 375 px |
| `Checkbox` (`src/components/ui/checkbox.tsx`) | still the stock shadcn look (4 px radius, `primary` tokens, opacity on disabled). Restyle to the frame: 16 px, square per the guide (the frame draws 2 px, see section 8), 1 px ink-strong border, signal fill with a white check when checked, focus outline as every control |
| `Card` | not used on these screens any more; stays for the app |
| `src/lib/auth.ts` | section 3 |
| `src/lib/schemas/auth.ts` | `PASSWORD_MIN` 12 (D2); new `forgotPasswordSchema`, `resetPasswordSchema` (password plus confirm, refine on match), `resendVerificationSchema`; `signInSchema` gains `rememberMe` |
| `messages/en.json` | section 1.8; `Auth.signIn`, `Common.signIn` and `Nav.signOut` keep their names and their text becomes "Log in" and "Log out" |
| `e2e/helpers.ts`, `e2e/onboarding.spec.ts`, `e2e/accessibility.spec.ts` | new labels, the confirmation step, the new screens in the axe list |
| `src/lib/seed/dev-account.ts` | marks the dev account confirmed |
| `compose.yaml`, `.env.example`, `docs/local-dev.md`, `docs/development-guide.md`, `docs/ui-ux-guide.md`, CLAUDE.md | mail catcher, new variables, the decision rows |

### New

| Piece | Notes |
| --- | --- |
| Tokens `--ink-on-dark` #A9A59D and `--line-on-dark` #4A4742 | muted text and hairlines on the asphalt panels. Neither exists; `--line-dark` (#7C7970 at 30 percent) is close but not the drawn value. A type token `--text-auth-title` 36/36 for the form headings (nothing between `text-h1` 28 and `text-section` 48) |
| `src/components/auth/auth-shell.tsx`, `side-panel.tsx`, `fact-rows.tsx` | the layout, the panel in its two tones, the "LABEL: value" rows |
| `src/components/auth/sample-score-card.tsx`, `waiting-card.tsx` | the two boxed cards on the Sign Up and Log in screens |
| `src/components/auth/resend-button.tsx` | secondary button plus the mono countdown, driven by a `retryAfter` from the server; counts down in the client, rendered enabled without JavaScript (the server enforces the cooldown either way) |
| `src/components/auth/password-checklist.tsx` | the three-row "IT NEEDS TO BE" card, `role="list"`, each row `aria-checked` through text ("met" / "not yet" visually hidden), never colour alone |
| `src/components/auth/forgot-password-form.tsx`, `reset-password-form.tsx`, `check-inbox.tsx` | the new forms (the sign-in and create-account forms are restyled in place) |
| `src/app/(auth)/check-inbox`, `forgot-password`, `reset-password` pages and the `verify-email` redirect route | section 3; `verify-email` renders nothing |
| `src/lib/email/` | section 5 |
| `src/lib/rate-limit.ts` | section 6 |
| `src/worker/jobs/email/` and `src/worker/jobs/auth-cleanup/` | sections 5 and 4 |
| `public/email/logo-dark.png` | emails cannot load SVG reliably (Gmail strips it); a 66 × 64 PNG export of the dark lockup logo, served from the web app and referenced by absolute URL |

## 3. Routes and what Better Auth provides

Better Auth 1.7.12 is installed and owns `/api/auth/*`. Everything below was read from the installed source (`node_modules/better-auth/dist/api/routes/*.mjs`) and `@better-auth/core` option types, not from memory.

### Pages

| Route | Method | Who | Does |
| --- | --- | --- | --- |
| `/create-account` | GET, server action | visitor | restyled. The action calls `auth.api.signUpEmail`; with confirmation on, Better Auth creates the user without a session, sends the confirmation email through our `sendVerificationEmail`, and answers a duplicate address with a synthetic success. The action sets the pending-email cookie and redirects to `/check-inbox` |
| `/sign-in` | GET, server action | visitor | restyled. `auth.api.signInEmail` with `rememberMe: false` when the box is unticked (Better Auth then sets a session cookie without `maxAge`, so it ends with the browser). On `EMAIL_NOT_VERIFIED` (403) Better Auth has already resent the link (`sendOnSignIn`); the action sets the pending cookie and redirects to `/check-inbox` |
| `/check-inbox` | GET, server action (resend) | visitor | reads the pending-email cookie. Resend calls `auth.api.sendVerificationEmail({ email, callbackURL: "/verify-email" })`, which answers the same way for unknown and already-confirmed addresses and pads the response to 500 ms |
| `/verify-email` | GET, redirect only | visitor | the `callbackURL` Better Auth redirects to after `GET /api/auth/verify-email?token=…&callbackURL=/verify-email`. It has no screen. No `error` query: the email is confirmed and, with `autoSignInAfterVerification`, the session cookie is already set, so it clears the pending cookie and redirects to `/questionnaire/basics` (or the next unfinished step). `error=TOKEN_EXPIRED`, `INVALID_TOKEN` or `USER_NOT_FOUND`: redirects to `/check-inbox?error=link`, where the drawn Check inbox screen shows the attention banner and its "Send it again" button (with the email field when the cookie is gone) |
| `/forgot-password` | GET, server action | visitor | `auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } })`. Better Auth looks the user up, fakes the same work when there is none, and always returns `status: true`. The same page shows the success banner above the form |
| `/reset-password` | GET, server action | visitor with a token | the email button points at Better Auth's `GET /api/auth/reset-password/:token?callbackURL=/reset-password`, which checks the stored token and redirects to `/reset-password?token=…` or `/reset-password?error=INVALID_TOKEN`. The page reads the token's `Verification` row (identifier `reset-password:<token>`, value is the user id) to show the address in the "SIGNED IN AS" card and the minutes left. The action calls `auth.api.resetPassword({ body: { newPassword, token } })` (single use: the row is consumed inside the password update, and every session is revoked by `revokeSessionsOnPasswordReset`), then `auth.api.signInEmail` with the address and the new password so the person is signed in, then redirects to the list |
| `/dashboard`, `/questionnaire/*`, `/opportunities/*` | | | unchanged. `src/proxy.ts` keeps its matcher; the new pages are public |

No new route handlers under `/api`: the flows are page actions calling `auth.api.*` on the server, which is the pattern the sign-in and create-account actions already use. The REST table in the development guide gains no rows, and `/api/auth/*` stays Better Auth's.

### Better Auth configuration (`src/lib/auth.ts`)

| Option | Value | Why |
| --- | --- | --- |
| `emailAndPassword.requireEmailVerification` | `true` | sign-in throws `EMAIL_NOT_VERIFIED` (403) for an unconfirmed user; sign-up stops creating a session and answers duplicates generically |
| `emailAndPassword.autoSignIn` | stays `true`, but Better Auth skips it while confirmation is required | |
| `emailAndPassword.minPasswordLength` | 12 (D2) | checked by Better Auth on sign-up and reset, and by Zod before that |
| `emailAndPassword.sendResetPassword` | enqueue the reset email (section 5) | `url` is the Better Auth callback with our `redirectTo` |
| `emailAndPassword.resetPasswordTokenExpiresIn` | 3600 (the default) | "Good for 60 minutes" as drawn |
| `emailAndPassword.revokeSessionsOnPasswordReset` | `true` | "signs out every other device", done in the same transaction as the password update |
| `emailAndPassword.onExistingUserSignUp` | when the existing account is unconfirmed, enqueue the drawn confirmation email again; when it is confirmed, enqueue nothing (D12, section 8 item 5) | runs only when the address exists, after the same password hashing as a new sign-up, and the HTTP answer is identical either way |
| `emailVerification.sendVerificationEmail` | enqueue the confirmation email | called on sign-up, on each unconfirmed sign-in, and on resend |
| `emailVerification.sendOnSignIn` | `true` | the sign-in screen never has to explain; the person lands on Check inbox with a fresh link |
| `emailVerification.autoSignInAfterVerification` | `true` | "One click and you are in": the link both confirms and starts the session |
| `emailVerification.expiresIn` | 86400 | "EXPIRES: In 24 hours" as drawn (default is one hour) |
| `rateLimit` | `enabled: true`, `storage: "database"`, custom rules in section 6 | the built-in limiter only protects HTTP calls to `/api/auth/*`, not `auth.api.*` calls from server actions; section 6 covers the rest |
| `advanced.ipAddress.ipAddressHeaders` | `["cf-connecting-ip", "x-forwarded-for"]` | Cloudflare sits in front of Coolify; without this every visitor shares the proxy's address and one person's limit blocks everyone |
| `plugins: [nextCookies()]` | stays last | the actions set cookies |

Token facts worth knowing: the confirmation token is a signed JWT (not stored), so it cannot be revoked early, but once the address is confirmed a second click only redirects and never creates a session. The reset token is a 24-character random id stored in `Verification` with its expiry and deleted when used, so it is single use in the strict sense. Better Auth's `GET /reset-password/:token` only redirects and does not consume the token, so an email scanner that pre-fetches links cannot burn it; the token is consumed by the POST from our form.

## 4. Database and sessions

| Change | Detail |
| --- | --- |
| No new columns for the flow | `User.emailVerified` and the `Verification` table already exist (generated by Better Auth in M0 and never used) |
| New `RateLimit` model | Better Auth's `rateLimit` table (`key` unique, `count`, `lastRequest` bigint) when `rateLimit.storage` is `"database"`. Generated with `npx auth@latest generate --config src/lib/auth.ts -y`, then one migration. Our own limiter (section 6) uses the same table with `app:`-prefixed keys |
| Backfill migration | `UPDATE "user" SET "emailVerified" = true WHERE "emailVerified" = false` in the same migration, dated. Every account that exists before this ships (staging testers, the dev account) was created without confirmation and would otherwise be locked out. Production has no users yet; the statement is harmless there |
| Seed | `seedDevAccount` sets `emailVerified: true` after `signUpEmail`, otherwise `npm run db:seed` produces an account that cannot log in and every Playwright run fails |
| Unconfirmed accounts | cannot log in (403 from Better Auth) and hold no session. The `verification` table grows with expired reset rows; Better Auth deletes a reset row when it is used, not when it expires. A weekly `auth-cleanup` worker job deletes expired `Verification` rows and unconfirmed users older than 7 days that have no `CompanyProfile` (D7). Singleton key, safe to rerun |
| Sessions | "Keep me logged in" ticked (default): the 7-day session and cookie as today. Unticked: same database row, cookie without `maxAge`. Reset: `revokeSessionsOnPasswordReset` deletes every session row for the user, then the action signs them in fresh. Sign-in failures do not touch sessions |
| Pending-email cookie | `bb_pending_email`, httpOnly, sameSite lax, 24 hours, value is the address only, set by the sign-up and sign-in actions and cleared by `/verify-email` on success. It is a convenience for Check inbox, never trusted for anything else |
| Cookie cache | stays off, so a revoked session is dead on the next request everywhere |

## 5. Email

### Provider and transport (D6)

Every environment sends through nodemailer (10.3.1, Node 20 or later, read at nodemailer.com/smtp on Nov 2, 2026). There is no SES code path: `@aws-sdk/client-ses` is installed and imported nowhere, so slice 1 removes it from `package.json`, and the stack lines in CLAUDE.md and the development guide change in slice 6.

| Environment | `EMAIL_TRANSPORT` | Goes to |
| --- | --- | --- |
| Laptop | `smtp` | Mailpit on `localhost:1025`, no credentials, read at http://localhost:8025 |
| CI, Playwright, unit tests | `file` | one JSON file per message under `EMAIL_FILE_DIR` (default `.data/mail`, gitignored); the e2e suite reads the link from the newest file for its address |
| Staging, production | `smtp` | TurboSMTP, one set of credentials per environment |

TurboSMTP settings, from the serversmtp.com knowledge base (not a product page, so confirm in the TurboSMTP dashboard before the first staging send): host `pro.turbo-smtp.com`; ports 25, 587 and 2525 for plain or STARTTLS and 465 for SSL from the start; username and password are the account's SMTP credentials. The plan uses 587 with `requireTLS: true` so a server that refuses the STARTTLS upgrade fails instead of sending in clear. The sending domain `beaverbids.ca` must be authenticated in TurboSMTP (its SPF and DKIM records added in Cloudflare DNS, plus a DMARC record) or the confirmation emails land in spam. That DNS work is the one task outside the repo and it gates the staging test in slice 6.

Variables:

| Variable | Who reads it | Laptop value |
| --- | --- | --- |
| `EMAIL_TRANSPORT` | worker | `smtp` |
| `SMTP_HOST`, `SMTP_PORT` | worker | `localhost`, `1025` |
| `SMTP_USER`, `SMTP_PASSWORD` | worker | empty (Mailpit takes no login; nodemailer sends without `auth` when both are empty) |
| `SMTP_SECURE` | worker, optional | unset; `true` only for port 465 |
| `EMAIL_FROM` | worker (header) and web (the FROM row on Check inbox) | `BeaverBids <hello@beaverbids.ca>` |
| `SUPPORT_EMAIL` | worker (reset email) and web (three screens, the landing form) | `support@beaverbids.ca` |
| `EMAIL_POSTAL_ADDRESS` | worker (footer) | empty on a laptop, required in production |
| `EMAIL_FILE_DIR` | worker, `file` only | `.data/mail` |

The SMTP credentials live only in the worker's Coolify environment. The web app never opens an SMTP connection: it enqueues.

One module, `src/lib/email/`:

| File | Role |
| --- | --- |
| `config.ts` | one Zod schema over the variables above, parsed once at startup. Outside production, missing values fall back to the laptop defaults. With `NODE_ENV=production` (staging and production both run the production build) `EMAIL_TRANSPORT` must be `smtp` and every one of `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `SUPPORT_EMAIL` and `EMAIL_POSTAL_ADDRESS` must be set, or the parse throws naming the variable. This is the loud failure |
| `transport.ts` | `createEmailTransport()`: `smtp` builds one pooled nodemailer transporter (`pool: true`, `connectionTimeout` 10 s so a dead host fails fast and pg-boss retries); `file` writes JSON. In production the worker also awaits `transporter.verify()` (connects and logs in without sending) before registering any queue, and exits when that fails, the same way it refuses to start without S3 |
| `send.ts` | `sendEmail({ to, template, params, locale })`: renders, sends, logs the message id and template name, never the body or the URL |
| `templates/` | `confirm-email.ts`, `reset-password.ts`, `shell.ts` (header, rule, footer). Each returns `{ subject, html, text }`. No templating library: table layout, inline styles, the tokens as hex constants in one place, the logo as an absolute URL to `public/email/logo-dark.png`. Fonts fall back to Arial and a system monospace, since Archivo will not load in most clients; headlines keep their uppercase and weight. Two templates only (D12) |
| `i18n.ts` | `createTranslator` from next-intl with the user's `language` column, so the worker renders in the right language without `next-intl/server` |

### Where sending happens

The rule in CLAUDE.md stands: no sending inside a page or route handler. Better Auth calls `sendVerificationEmail` and `sendResetPassword` during the request, so those callbacks only enqueue a `send-email` job through the web app's send-only pg-boss instance and return. The worker (`src/worker/jobs/email/`) registers the queue with `retryLimit: 3`, `retryDelay: 30`, `retryBackoff: true`, `expireInSeconds: 120`, and `deleteAfterSeconds: 3600`, because the job payload carries the link with its token and should not sit in the job archive for the default seven days. The payload is a Zod schema in `src/lib/queues.ts` (`template`, `to`, `locale`, `params`) parsed on both sides, like the scoring jobs.

Latency: a pg-boss send is one insert, the worker polls every two seconds, an SMTP submission takes about a second. "The link lands in a few seconds" holds.

### Setup notes

- Laptop: `compose.yaml` gains a `mail` service, Mailpit (SMTP on 1025, web UI on http://localhost:8025, no auth, no persistence). `.env.example` lists the variables above with the laptop values. docs/local-dev.md explains that confirmation and reset links open from Mailpit and that `npm run e2e` needs no mail service.
- CI: the workflow sets `EMAIL_TRANSPORT=file`; nothing else.
- Staging and production: a TurboSMTP account, the domain authenticated, one credential pair per environment entered in the worker's Coolify environment with `EMAIL_TRANSPORT=smtp`, `EMAIL_FROM`, `SUPPORT_EMAIL` and the postal address. The web app gets `EMAIL_FROM` and `SUPPORT_EMAIL` only. A deploy with a missing variable fails at worker startup and shows as a failed deploy in Coolify.

### When sending fails

| Failure | What happens |
| --- | --- |
| A production variable is missing or the SMTP login fails | the worker exits at startup with the variable or the SMTP error in the log and in Sentry, and Coolify marks the deploy failed. The web app keeps running: sign-ups and reset requests still succeed and their jobs wait in the queue until a worker with the right environment starts, and "Send it again" works after the cooldown |
| Enqueue fails in the web app (worker never ran, database down) | the callback catches, logs, reports to Sentry, and does not throw: the account or reset request still succeeds and the person sees Check inbox. They can press "Send it again" after the cooldown, which tries the enqueue once more. Sign-up itself fails loudly if the database is down, which is the right outcome |
| TurboSMTP rejects, times out, or the plan's quota is spent | pg-boss retries three times over about three minutes; the final failure raises a Sentry error with the template name and the job id, never the address or the link |
| Bounce or complaint | out of scope for this slice. Noted for the digest work, where feedback loops matter more |

## 6. Security rules

| Rule | How |
| --- | --- |
| Single-use, expiring links | reset: stored token, 60 minutes, consumed on use (Better Auth). Confirmation: signed token, 24 hours, becomes a no-op once the address is confirmed and never creates a session on a second click. Both are unguessable (24 random characters, or an HS256 signature with `BETTER_AUTH_SECRET`). Links are never logged, never kept in a job row for more than an hour, and the token never appears in a page URL except on `/reset-password`, where the page sends `Referrer-Policy: no-referrer` and the form posts it in the body |
| Same answer whether or not an address has an account | forgot password: Better Auth returns the same body and fakes the token work for unknown addresses; the page shows the drawn note. Resend: Better Auth pads to 500 ms and answers `status: true` for unknown and already-confirmed addresses. Sign-up: with confirmation on, a duplicate address gets a synthetic user and the same redirect to Check inbox; an unconfirmed existing owner gets the confirmation email again and a confirmed owner gets nothing (section 8, item 5). The `emailTaken` message is deleted. Sign-in: one banner for a wrong email or a wrong password, as drawn |
| Rate limits on sign-up, resend and forgot password | Better Auth's limiter covers direct hits on `/api/auth/*` (3 per 10 s on sign-in and sign-up, 3 per 60 s on reset request and resend, by IP). It does not see our server actions, so `src/lib/rate-limit.ts` applies the same idea inside the actions with a fixed window on the `RateLimit` table: sign-up 5 per hour per IP; sign-in 10 per 15 minutes per IP and 5 per 15 minutes per address; resend 1 per 60 seconds per address (the drawn cooldown) and 5 per hour; forgot password 1 per 60 seconds per address, 5 per hour per address, 20 per hour per IP; reset submit 10 per hour per IP. The address key is the lowercase address hashed, so the table never stores addresses. Over the limit, the action returns `tooManyAttempts` with the minutes to wait, and the resend button returns `retryAfter` seconds for the countdown. The IP comes from `cf-connecting-ip`, then `x-forwarded-for`, read through one helper shared with Better Auth's option |
| Ending old sessions after a reset | `revokeSessionsOnPasswordReset: true` deletes every session row in the same transaction as the new hash; the action then creates one fresh session. Changing the email or password from inside the app is not in this slice |
| Unconfirmed accounts cannot log in | `requireEmailVerification: true`; the check is Better Auth's, after the password check, so a wrong password on an unconfirmed account still shows the one banner and never reveals the account exists |
| Password rules | 12 to 128 characters (D2), checked by Zod in the form and the action and again by Better Auth. "Different from your last password" is checked in the reset action by verifying the new password against the stored hash (`better-auth/crypto` scrypt verify on the `Account.password` row of the token's user); on a match the action returns `passwordSameAsOld` and nothing is saved |
| CSRF and origins | server actions carry Next.js's origin check; Better Auth's `originCheck` validates `callbackURL` and `redirectTo` against `BETTER_AUTH_URL`, so a crafted link cannot bounce a token to another host |
| Timing | the reset request and the resend are not awaited inside Better Auth beyond the enqueue, and the enqueue cost is the same for known and unknown addresses |
| Logging | the structured log records template name, job id, message id and the hashed address key; never an address in clear, never a token or URL. Sentry breadcrumbs follow the same rule |

## 7. Slices and tests

Each slice is one pull request into `development`, small enough to review in one sitting, with lint, typecheck, unit tests and (from slice 3) Playwright green. Slice 1 and 2 can be built in either order; 3 to 5 depend on both.

### Slice 1: email plumbing

`src/lib/email/` (config, transport, send, templates, i18n), the `send-email` queue and worker job, Mailpit in `compose.yaml`, `nodemailer` added and `@aws-sdk/client-ses` removed (D6), the production guard and the startup `verify()`, the env variables, `public/email/logo-dark.png`, the `Email.*` messages. No screen changes.

Tests: template unit tests snapshot the subject, text and HTML for both emails in English with sample params and assert no em dash, no raw token in the text except on its own URL line, the postal address and support address from params, and the `{year}` substitution. Transport unit test for `file` (writes one JSON per message, readable back) and the config guard (`EMAIL_TRANSPORT=file` with `NODE_ENV=production` throws; `smtp` with `SMTP_PASSWORD` unset throws naming the variable; empty `SMTP_USER` and `SMTP_PASSWORD` outside production yields a transporter without `auth`). Queue schema test (a job without `to` or with an unknown template fails to parse). Worker integration test (`*.int.test.ts`): enqueue through the schema, run the handler with the file transport, assert one file. Manual: `npm run worker` plus Mailpit shows both emails, with Mailpit's HTML check and dark mode preview (screenshots in the PR).

### Slice 2: auth configuration, schema and limiter

Built Nov 2, 2026, together with slices 3 and 4 (the sign-up flow cannot ship without them). Differences from the text below: none.

`src/lib/auth.ts` options from section 3 wired to slice 1's enqueue helpers, the `RateLimit` model and migration with the `emailVerified` backfill, `src/lib/rate-limit.ts`, the IP helper, `PASSWORD_MIN` 12 and the new Zod schemas, the seed change, the `auth-cleanup` job. The existing screens keep working (sign-up now lands on an interim Check inbox page in the old card layout, restyled in slice 4).

Tests: schema unit tests (12-character minimum, confirm mismatch, trim and lowercase on the forgot form). Rate limit integration test on the real table: N calls pass, N plus one returns the wait, the window resets, keys never contain the raw address. Auth integration tests against the local database: sign-up creates no session and enqueues one `send-email` job; sign-up with an existing unconfirmed address returns the same shape and enqueues one more confirmation job, and with a confirmed address enqueues nothing; sign-in on an unconfirmed user throws `EMAIL_NOT_VERIFIED` and enqueues a job; `verifyEmail` with the issued token sets `emailVerified` and returns a session; `requestPasswordReset` for an unknown address returns `status: true` and enqueues nothing; `resetPassword` consumes the token, a second use fails, and every other session row is gone. Cleanup job integration test with fixture rows. Migration applies on a copy of a seeded database and the dev account can still sign in afterwards.

### Slice 3: layout and Log in

Built Nov 2, 2026 with the sign-up flow. Differences: the side panel is 360 px wide with 48 px gutters, not 315 px, because the rendered frame shows the sample card and the headline needing that room (the 315 px figure was the frame's flex basis). "FORGOT IT?" waits for slice 5, since it points at a page that does not exist yet. The checkbox is restyled here.

`AuthShell`, side panel, fact rows, the token additions, the restyled Checkbox, the Log in screen with "FORGOT IT?" (pointing at a slice 5 route that 404s until then, so the link ships hidden behind the page existing), remember me, the unconfirmed redirect, the global counts card (D4), the header text "Log out" (D1).

Tests: unit tests for the counts query (new since last successful ingest, closing within 7 days, active sources only). Playwright: log in on desktop and 375 px (no horizontal scroll, one H1, labels visible), wrong password shows one banner and no field hint about which half, unticked remember me yields a cookie without an expiry (read through `context.cookies()`), an unconfirmed account (created through the file transport without clicking the link) lands on Check inbox. Axe WCAG 2.2 AA on the screen in both projects, colour contrast against the guide's known exceptions. Keyboard: tab order lockup, email, password, SHOW, forgot, checkbox, button, create link.

### Slice 4: Sign up, Check inbox and the confirmation landing

Built Nov 2, 2026. Differences: `/verify-email` is a redirect-only route handler (no screen); a dead link lands on `/check-inbox?error=link` with the attention banner above the drawn copy; an expired-token Playwright case is replaced by a tampered-token case, because the confirmation token is a signed JWT whose expiry cannot be forged without the secret from inside the suite.

The restyled create-account form (without the website field, D3), the consent line, `/check-inbox` with the resend button, countdown and the expired-link banner, the `/verify-email` redirect route, the pending-email cookie.

Tests: Playwright end to end: sign up, see Check inbox with the address in bold, "Send it again" disabled with the countdown, read the link from the file transport, open it, land on the questionnaire basics step signed in, sign out, sign in again without a bounce. Second run: open the same link again, expect the sign-in page (no session), not an error. Expired token: craft a token with a past expiry using `BETTER_AUTH_SECRET` in the test, expect to land on Check inbox with the banner and a working resend. Duplicate sign-up: same screen, same copy, no "already exists" anywhere; one more confirmation file when the account is unconfirmed and no new file when it is confirmed. Resend over the limit shows the wait. `onboarding.spec.ts` gains the confirmation step and keeps asserting the 92. Axe on both screens. 375 px: the band layout, the resend row wraps without overflow.

### Slice 5: Forgot password and Set new password

The two forms, the sent state, the reset-link callback handling, the "SIGNED IN AS" card from the token row, the minutes-left line, the checklist, the same-as-old check, sign-in after save, the expired-link banner.

Tests: unit test for the checklist state function (length, match, server-reported difference). Playwright: request a reset for the dev account, read the link, set a new password, land on the list signed in; a second browser context that was signed in before the reset is signed out on its next navigation; the old password no longer works; the same link a second time shows the expired banner; a request for an unknown address shows the identical sent state and produces no file; mismatch and too-short errors sit under the fields; the same-as-old password returns the error and leaves the old password working. Axe and 375 px as before. The dev account's password is restored at the end of the spec so other specs keep passing.

### Slice 6: documentation, guide rows and staging check

CLAUDE.md (the stack line "Email: Amazon SES" becomes TurboSMTP over SMTP through nodemailer, the MVP "sends no email" sentence, the new routes and variables), docs/development-guide.md (the stack table's Email row, the M0 row and its SES access item, the API table note, the data model's `rateLimit` row, the "Later phase" email row), docs/ui-ux-guide.md (the auth screen pattern, the two new tokens, the checkbox), docs/local-dev.md (Mailpit, the "S3, SES and MixRoute" line), .env.example final pass, the memory note. Staging: TurboSMTP domain authenticated, credentials in the worker environment, one full pass of each flow by a second person, Sentry shows the job events.

Tests: the PR carries the staging checklist ticked, with Mailpit and TurboSMTP delivery screenshots, and the claims check from section 8, item 24, signed off. No code beyond docs and config.

## 8. Unclear or missing in the Figma

Decision D12: defaults as proposed, and nothing the Figma does not draw. The "Decision" column is final unless the approval is changed.

| # | Item | Decision |
| --- | --- | --- |
| 1 | No phone layout for any of the five screens (every frame is 1040 px desktop) | Under 1024 px: the panel collapses to a 64 px band with the lockup, the headline and facts are hidden, the form fills the width with 16 px gutters. A responsive rule on the drawn screens, not a new screen. Flag to design |
| 2 | No "sent" state for Forgot password and no Check inbox variant for a reset link | No variant. Forgot password shows the states page's success banner above its own form; the form stays so a second submit is the resend |
| 3 | No expired or invalid link page for either flow | No page. The states page's attention banner (2 px signal border, one small primary) on Check inbox for a dead confirmation link and on Set new password for a dead reset link, copy in section 1.8 marked "not drawn" |
| 4 | No success, resend-limit or error states on Check inbox beyond the cooldown | Success banner for "sent again", note banner for the limit, as in section 1.3 |
| 5 | Sign-up with an address that already has an account produces no visible difference, so the drawn screens say "check your inbox" and the drawn emails say nothing about it | Accepted: no third email. An unconfirmed existing account gets the drawn confirmation email again, so the screen stays true. A confirmed existing account gets nothing: that person sees Check inbox, nothing arrives, and "FORGOT IT?" on the log-in screen is their way in. Flag: a one-line email would fix this later |
| 6 | Email subjects: only "Confirm your email" is drawn (on Check inbox). No subject or preheader for the reset email | As proposed in section 1.8 |
| 7 | "Nothing is created until the link is used" in the confirmation email: the user row exists from sign-up, unconfirmed, until the cleanup job removes it | Kept as drawn; true within the cleanup window (D7) |
| 8 | The copyright line joins "BEAVERBIDS" and "MADE IN CANADA" with an em dash; "[STREET ADDRESS], [CITY], CANADA" is a placeholder | Middle dot; the address comes from `EMAIL_POSTAL_ADDRESS` and must be real before launch (Canada's anti-spam law expects a mailing address even on transactional email) |
| 9 | Password minimum 12 on both password screens; the states page and the built forms say 8 | 12 (D2): the drawn checklist says "Twelve characters or more" |
| 10 | Buttons on these frames are Archivo Bold at normal width, 13 px, 6 percent tracking; the states page and the built `Button` use condensed 16 px | Keep the built button, the states page is the handoff reference. Flag to design |
| 11 | Fields are 46 px tall with 14 px padding; the guide holds 50 px until design confirms | Keep 50 px, already an open item in the guide |
| 12 | The checkbox is drawn with a 2 px radius; the guide says no radius anywhere except score chips | Square, per the guide. Flag |
| 13 | Colours #4A4742 and #A9A59D on the asphalt panels are not in the token set | Two new tokens, section 2 |
| 14 | The Log in "WAITING FOR YOU" numbers cannot be the viewer's before log-in | Real global counts (D4, approved) |
| 15 | "SIX PORTALS · READ NIGHTLY · ALL CANADIAN", "Free while in beta", "Not needed" (card), "Same account for your whole team" | Kept as drawn (D5, approved); item 24 |
| 16 | The sample card scores 84 for "IT Managed Services and Cloud Support"; the product's sample tender scores 92 | Kept as drawn |
| 17 | "Company website" on Sign Up promises auto-fill from the site | Dropped (D3) |
| 18 | "Terms of Service" and "Privacy Policy" links have no pages | No pages added here. The links point at `/terms` and `/privacy`, which fall back to the landing page footer until the M5 privacy work ships them; the PR notes it |
| 19 | The email link is drawn as `https://app.beaverbids.ca/verify?token=TOKEN` and `/reset?token=TOKEN` | The real links are Better Auth's `/api/auth/verify-email?token=…&callbackURL=/verify-email` and `/api/auth/reset-password/<token>?callbackURL=/reset-password` on `BETTER_AUTH_URL`. The host is whatever staging and production are deployed on (open question: domains) |
| 20 | "Change your email address" on Check inbox: an unconfirmed person has no session, so Better Auth's change-email cannot run | The link goes to `/create-account` with the name prefilled from the cookie; the mistyped account is removed by the cleanup job (D7). The email that went to the wrong address is harmless: the link only confirms that address for an account nobody can use without the password |
| 21 | Sender shown as `hello@beaverbids.ca`, support as `support@beaverbids.ca`, while `NEXT_PUBLIC_DEMO_REQUEST_EMAIL` is already `support@beaverbids.ca` | `EMAIL_FROM` and `SUPPORT_EMAIL` (D8); `SUPPORT_EMAIL` feeds the landing form too and `NEXT_PUBLIC_DEMO_REQUEST_EMAIL` is retired in slice 6 |
| 22 | "Keep me logged in on this computer" is ticked by default | Kept as drawn; the 7-day session is the current behaviour, so unticking is the new option |
| 23 | Placeholders are a person's name and a real-looking address | Kept as drawn; the mono label carries the meaning, and `prattsons.ca` is fictional. Confirm the domain is not registered to someone before staging |
| 24 | The panels carry product claims nobody has confirmed: "SIX PORTALS · READ NIGHTLY · ALL CANADIAN", "Free while in beta", "CARD: Not needed", "SETUP: About 5 minutes", "Same account for your whole team", the sample card at 84, "your first scored tenders land tomorrow morning" in the confirmation email | Open item: before launch, someone confirms every marketing claim drawn on the panels and in the emails is true, and the messages file is corrected where one is not. Added to the slice 6 checklist |
