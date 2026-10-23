"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = {};

export function SignInForm() {
  const t = useTranslations("Auth.signIn");
  const tErrors = useTranslations("Auth.errors");
  const [state, action, pending] = useActionState(signInAction, initialState);

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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password ? tErrors(state.fieldErrors.password) : undefined}
      />

      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
