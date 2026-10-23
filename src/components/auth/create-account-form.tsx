"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createAccountAction, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = {};

export function CreateAccountForm() {
  const t = useTranslations("Auth.createAccount");
  const tErrors = useTranslations("Auth.errors");
  const [state, action, pending] = useActionState(createAccountAction, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {state.formError ? (
        <p
          role="alert"
          className="rounded-lg border border-signal bg-signal/5 px-3 py-2 text-sm leading-5 text-asphalt"
        >
          {tErrors(state.formError)}
        </p>
      ) : null}

      <FormField
        id="name"
        name="name"
        type="text"
        label={t("name")}
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
        hint={t("passwordHint")}
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password ? tErrors(state.fieldErrors.password) : undefined}
      />

      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
