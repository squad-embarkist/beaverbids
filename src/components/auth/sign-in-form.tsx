"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const initialState: AuthFormState = {};

export function SignInForm() {
  const t = useTranslations("Auth.signIn");
  const tErrors = useTranslations("Auth.errors");
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-[26px]">
      {/* One banner for a wrong email or a wrong password; it never says
          which half was wrong. */}
      {state.formError ? (
        <Banner variant={state.formError === "tooManyAttempts" ? "note" : "error"} role="alert">
          {tErrors(state.formError, { minutes: state.minutes ?? 1 })}
        </Banner>
      ) : null}

      <FormField
        id="email"
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

      <FormField
        id="password"
        name="password"
        type="password"
        label={t("password")}
        placeholder={t("passwordPlaceholder")}
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password ? tErrors(state.fieldErrors.password) : undefined}
      />

      {/* Ticked by default, as drawn: the 7 day session. Unticked, the
          session cookie ends with the browser. */}
      <label htmlFor="rememberMe" className="flex w-fit cursor-pointer items-center gap-2.5 text-body-15 text-asphalt">
        <Checkbox id="rememberMe" name="rememberMe" defaultChecked />
        {t("rememberMe")}
      </label>

      {/* Working state: the label becomes the verb in progress and the
          button keeps focus; it is never shown as disabled. */}
      <Button type="submit" className="w-full" busy={pending}>
        {pending ? t("working") : t("submit")}
      </Button>
    </form>
  );
}
