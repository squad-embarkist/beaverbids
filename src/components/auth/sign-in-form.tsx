"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = {};

export function SignInForm() {
  const t = useTranslations("Auth.signIn");
  const tErrors = useTranslations("Auth.errors");
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {state.formError ? (
        <Banner variant="error" role="alert">
          {tErrors(state.formError)}
        </Banner>
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

      {/* Working state: the label becomes the verb in progress and the
          button keeps focus; it is never shown as disabled. */}
      <Button type="submit" className="w-full" busy={pending}>
        {pending ? t("working") : t("submit")}
      </Button>
    </form>
  );
}
