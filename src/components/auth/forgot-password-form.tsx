"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { forgotPasswordAction, type ForgotFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

const initialState: ForgotFormState = {};

// The form on the Forget Password frame (32:1377): the address, the primary
// button and the drawn note under it. After a submit the success banner
// sits above the same form, with the same wording for every address, and
// a second submit is the resend (docs/plans/account-flow-plan.md, 1.4).
export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const tErrors = useTranslations("Auth.errors");
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-[26px]">
      {state.sent ? (
        <Banner variant="success" role="status">
          {t("sent", { email: state.values?.email ?? "" })}
        </Banner>
      ) : null}
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

      <Button type="submit" className="w-full" busy={pending}>
        {pending ? t("working") : t("submit")}
      </Button>

      <Banner variant="note">{t("sameMessage")}</Banner>
    </form>
  );
}
