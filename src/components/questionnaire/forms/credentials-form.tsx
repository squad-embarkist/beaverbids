"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/profile";
import { CLEARANCE_LEVELS } from "@/lib/schemas/vocab";
import { CheckRow, FieldError, FieldHint, FieldLabel, OptionCard, OptionGroup, describedBy, useErrorText } from "../fields";
import { KNOWN_CERTIFICATIONS, credentialsDefaults, credentialsFormSchema, type CredentialsFormValues } from "../form-schemas";
import { StepForm } from "../step-form";

export function CredentialsForm({ profile }: { profile: Profile | null }) {
  const t = useTranslations("Questionnaire.fields");
  const tVocab = useTranslations("Vocab");
  const errorText = useErrorText();
  const defaults = credentialsDefaults(profile);
  const form = useForm<CredentialsFormValues, unknown, ReturnType<typeof credentialsFormSchema.parse>>({
    resolver: zodResolver(credentialsFormSchema),
    defaultValues: defaults,
  });
  const { register, formState: { errors } } = form;
  const otherError = errorText(errors.otherCertifications?.message);
  const clearanceError = errorText(errors.securityClearance?.message);

  return (
    <StepForm step="credentials" form={form} skippable>
      <OptionGroup id="knownCertifications" legend={t("certifications")} hint={t("certificationsHint")}>
        {KNOWN_CERTIFICATIONS.map(({ code, key }) => (
          <OptionCard key={code} type="checkbox" value={code} defaultChecked={defaults.knownCertifications.includes(code)} label={tVocab(`certifications.${key}`)} {...register("knownCertifications")} />
        ))}
      </OptionGroup>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="otherCertifications">{t("otherCertifications")}</FieldLabel>
        <Textarea id="otherCertifications" rows={3} defaultValue={defaults.otherCertifications} aria-invalid={otherError ? true : undefined} aria-describedby={describedBy("otherCertifications", t("otherCertificationsHint"), otherError)} {...register("otherCertifications")} />
        <FieldHint id="otherCertifications-hint">{t("otherCertificationsHint")}</FieldHint>
        <FieldError id="otherCertifications-error">{otherError}</FieldError>
      </div>

      <CheckRow id="bonding" label={t("bonding")} defaultChecked={defaults.bonding} {...register("bonding")} />

      <OptionGroup id="securityClearance" legend={t("securityClearance")} hint={t("securityClearanceHint")} error={clearanceError} radio className="sm:grid-cols-2 lg:grid-cols-4">
        <OptionCard type="radio" value="none" defaultChecked={defaults.securityClearance === "none"} label={tVocab("clearances.none")} {...register("securityClearance")} />
        {CLEARANCE_LEVELS.map((level) => (
          <OptionCard key={level} type="radio" value={level} defaultChecked={defaults.securityClearance === level} label={tVocab(`clearances.${level}`)} {...register("securityClearance")} />
        ))}
      </OptionGroup>

      <CheckRow id="indigenousBusiness" label={t("indigenousBusiness")} hint={t("indigenousBusinessHint")} defaultChecked={defaults.indigenousBusiness} {...register("indigenousBusiness")} />
    </StepForm>
  );
}
