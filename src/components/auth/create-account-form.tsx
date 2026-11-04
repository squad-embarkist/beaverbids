"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createAccountAction, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = {};

export function CreateAccountForm() {
  const t = useTranslations("Auth.createAccount");
  const tErrors = useTranslations("Auth.errors");
  const [state, action, pending] = useActionState(createAccountAction, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-[26px]">
      {state.formError ? (
        <Banner variant={state.formError === "tooManyAttempts" ? "note" : "error"} role="alert">
          {tErrors(state.formError, { minutes: state.minutes ?? 1 })}
        </Banner>
      ) : null}

      <FormField
        id="name"
        name="name"
        type="text"
        label={t("name")}
        placeholder={t("namePlaceholder")}
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name ? tErrors(state.fieldErrors.name) : undefined}
      />

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
        hint={t("passwordHint")}
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password ? tErrors(state.fieldErrors.password) : undefined}
      />

      {/* Working state: the label becomes the verb in progress and the
          button keeps focus; it is never shown as disabled. */}
      <Button type="submit" className="w-full" busy={pending}>
        {pending ? t("working") : t("submit")}
      </Button>
    </form>
  );
}
