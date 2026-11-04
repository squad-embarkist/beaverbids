"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { resendConfirmationAction, type ResendFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

const initialState: ResendFormState = {};

// The right side of the Check inbox frame (32:1861): the signal envelope,
// the heading, the address in bold, the "NOTHING YET?" card with its two
// tips and the resend row, then the two text links. The resend button
// wears the cooldown look (the one use of the disabled state the guide
// allows) beside the mono countdown; without JavaScript it is enabled and
// the server enforces the cooldown either way.
export function CheckInbox({ email, retryAfter, linkExpired, supportEmail }: { email: string | null; retryAfter: number; linkExpired: boolean; supportEmail: string }) {
  const t = useTranslations("Auth.checkInbox");
  const tErrors = useTranslations("Auth.errors");
  const [state, action, pending] = useActionState(resendConfirmationAction, initialState);
  const secondsLeft = useCountdown(state.retryAfter ?? retryAfter, state);
  // Opened cold, the address typed into the field stands in for the cookie
  // once it has been sent to.
  const shownEmail = email ?? (state.sent ? (state.values?.email ?? null) : null);

  return (
    <>
      <Image src="/auth/envelope.svg" alt="" width={56} height={56} className="size-14" priority />

      {linkExpired && !state.sent ? (
        <Banner variant="attention" role="alert">
          {t("linkExpired")}
        </Banner>
      ) : null}
      {state.sent ? (
        <Banner variant="success" role="status">
          {t("resent")}
        </Banner>
      ) : null}
      {state.formError ? (
        <Banner variant={state.formError === "tooManyAttempts" ? "note" : "error"} role="alert">
          {tErrors(state.formError, { minutes: state.minutes ?? 1 })}
        </Banner>
      ) : null}

      <header className="flex flex-col gap-3">
        <h1 className="font-heading font-expanded text-auth-title font-extrabold text-asphalt">{t("title")}</h1>
        <p className="text-base leading-[26px] text-asphalt">
          {shownEmail ? t.rich("lead", { email: shownEmail, strong: (chunks) => <strong className="font-bold">{chunks}</strong> }) : t("leadNoEmail")}
        </p>
      </header>

      <form action={action} noValidate className="flex flex-col gap-4 border border-hairline bg-field p-[22px]">
        <p className="font-mono text-tag font-medium text-ink-strong">{t("nothingYet")}</p>
        <ul className="flex flex-col gap-4">
          {[t("tipWait"), t("tipSpam")].map((tip) => (
            <li key={tip} className="flex items-start gap-3 text-sm leading-[22px] text-asphalt before:mt-[7px] before:block before:size-2 before:shrink-0 before:bg-asphalt before:content-['']">
              {tip}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4 border-t border-stone-light pt-4">
          {shownEmail ? null : (
            <FormField
              id="resend-email"
              name="email"
              type="email"
              label={t("email")}
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              inputMode="email"
              required
              defaultValue={state.values?.email}
              error={state.fieldErrors?.email ? tErrors(state.fieldErrors.email) : undefined}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" size="sm" className="h-[46px] px-5 text-button-sm" busy={pending} disabled={secondsLeft > 0}>
              {pending ? t("resendWorking") : t("resend")}
            </Button>
            {secondsLeft > 0 ? (
              <span className="font-mono text-xs font-medium tracking-[0.1em] uppercase text-ink-strong" aria-live="off">
                {t("availableIn", { time: formatCountdown(secondsLeft) })}
              </span>
            ) : null}
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-3.5 border-t border-hairline pt-5 text-body-15 text-asphalt">
        <p>
          {t("wrongEmail")}{" "}
          <Link href="/create-account" className="text-link underline">
            {t("changeEmail")}
          </Link>
        </p>
        <p>
          {t("stillStuck")}{" "}
          <a href={`mailto:${supportEmail}`} className="text-link underline">
            {supportEmail}
          </a>
        </p>
      </div>
    </>
  );
}

// What the page shows while the address and the cooldown stream in: the
// same frame with a placeholder where the resend row goes, and no form.
// The fallback must not hold a form of its own: a submit that happens
// before hydration (or without JavaScript) comes back as a full page whose
// form state React attaches to the first matching form it renders, and a
// form in the fallback would take it and then be swapped out, losing the
// "Sent" banner (seen in CI on Nov 3, 2026).
export function CheckInboxSkeleton({ supportEmail }: { supportEmail: string }) {
  const t = useTranslations("Auth.checkInbox");
  return (
    <>
      <Image src="/auth/envelope.svg" alt="" width={56} height={56} className="size-14" priority />
      <header className="flex flex-col gap-3">
        <h1 className="font-heading font-expanded text-auth-title font-extrabold text-asphalt">{t("title")}</h1>
        <p className="text-base leading-[26px] text-asphalt">{t("leadNoEmail")}</p>
      </header>
      <div className="flex flex-col gap-4 border border-hairline bg-field p-[22px]" aria-busy="true">
        <p className="font-mono text-tag font-medium text-ink-strong">{t("nothingYet")}</p>
        <ul className="flex flex-col gap-4">
          {[t("tipWait"), t("tipSpam")].map((tip) => (
            <li key={tip} className="flex items-start gap-3 text-sm leading-[22px] text-asphalt before:mt-[7px] before:block before:size-2 before:shrink-0 before:bg-asphalt before:content-['']">
              {tip}
            </li>
          ))}
        </ul>
        <div className="border-t border-stone-light pt-4">
          <div aria-hidden className="h-[46px] w-40 animate-pulse bg-stone-light" />
        </div>
      </div>
      <div className="flex flex-col gap-3.5 border-t border-hairline pt-5 text-body-15 text-asphalt">
        <p>
          {t("wrongEmail")}{" "}
          <Link href="/create-account" className="text-link underline">
            {t("changeEmail")}
          </Link>
        </p>
        <p>
          {t("stillStuck")}{" "}
          <a href={`mailto:${supportEmail}`} className="text-link underline">
            {supportEmail}
          </a>
        </p>
      </div>
    </>
  );
}

// Counts down from the server's figure once a second, and restarts from a
// new figure whenever a submit returns one (a sent email, or a refused one
// with the wait left). No clock is read during render, so the first paint
// matches the server's number exactly. The server's value is the truth;
// this only paints it.
function useCountdown(seconds: number, state: ResendFormState): number {
  const [elapsed, setElapsed] = useState(0);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    setElapsed(0);
  }
  const left = Math.max(0, seconds - elapsed);
  const active = left > 0;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return left;
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
