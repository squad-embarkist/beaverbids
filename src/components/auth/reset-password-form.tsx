"use client";

import { CheckIcon, CircleIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { resetPasswordAction, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { checklistState } from "@/components/auth/password-checklist";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

const initialState: AuthFormState = {};

// The attention banner for a dead reset link (docs/plans/account-flow-plan.md,
// section 8 item 3): on this screen, never a page of its own, with the one
// small primary action back to Forgot password.
export function DeadLinkBanner() {
  const t = useTranslations("Auth.resetPassword");
  return (
    <Banner
      variant="attention"
      role="alert"
      action={
        <ButtonLink href="/forgot-password" size="sm">
          {t("expiredAction")}
        </ButtonLink>
      }
    >
      {t("expiredTitle")}
    </Banner>
  );
}

// The form on the set new password frame (34:3086): two boxes, the "IT
// NEEDS TO BE" card whose first and third rows tick as the person types,
// the primary button and the mono footnote. The token travels in the body.
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth.resetPassword");
  const tErrors = useTranslations("Auth.errors");
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  if (state.formError === "linkInvalid") return <DeadLinkBanner />;

  const checks = checklistState({ password, confirm, sameAsOld: state.fieldErrors?.password === "passwordSameAsOld" });
  const rows = [
    { label: t("needsLength"), met: checks.length },
    { label: t("needsDifferent"), met: false },
    { label: t("needsMatch"), met: checks.match },
  ];

  return (
    <form action={action} noValidate className="flex flex-col gap-[26px]">
      {state.formError ? (
        <Banner variant={state.formError === "tooManyAttempts" ? "note" : "error"} role="alert">
          {tErrors(state.formError, { minutes: state.minutes ?? 1 })}
        </Banner>
      ) : null}
      <input type="hidden" name="token" value={token} />

      <FormField
        id="password"
        name="password"
        type="password"
        label={t("password")}
        placeholder={t("passwordPlaceholder")}
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={state.fieldErrors?.password ? tErrors(state.fieldErrors.password) : undefined}
      />

      <FormField
        id="confirm"
        name="confirm"
        type="password"
        passwordToggle={false}
        label={t("confirm")}
        placeholder={t("confirmPlaceholder")}
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={state.fieldErrors?.confirm ? tErrors(state.fieldErrors.confirm) : undefined}
      />

      <div className="flex flex-col gap-3 bg-stone-light p-5">
        <p className="font-mono text-tag font-medium text-ink-strong">{t("needs")}</p>
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.label} className={cn("flex items-center gap-3 text-sm", row.met ? "text-asphalt" : "text-ink-strong")}>
              {row.met ? <CheckIcon aria-hidden className="size-[18px] shrink-0" strokeWidth={2.5} /> : <CircleIcon aria-hidden className="size-[18px] shrink-0" strokeWidth={1.5} />}
              <span>{row.label}</span>
              <span className="sr-only">{row.met ? t("needsMet") : t("needsNotYet")}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button type="submit" className="w-full" busy={pending}>
        {pending ? t("working") : t("submit")}
      </Button>

      <p className="font-mono text-mono-xs leading-[18px] font-medium tracking-normal text-ink-strong">{t("signsOut")}</p>
    </form>
  );
}
