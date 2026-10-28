"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { Profile } from "@/lib/profile";
import { REGION_CODES } from "@/lib/schemas/vocab";
import { OptionCard, OptionGroup, useErrorText } from "../fields";
import { regionsDefaults, regionsFormSchema, type RegionsFormValues } from "../form-schemas";
import { StepForm } from "../step-form";

export function RegionsForm({ profile }: { profile: Profile | null }) {
  const t = useTranslations("Questionnaire.fields");
  const tVocab = useTranslations("Vocab");
  const errorText = useErrorText();
  const defaults = regionsDefaults(profile);
  const form = useForm<RegionsFormValues, unknown, ReturnType<typeof regionsFormSchema.parse>>({
    resolver: zodResolver(regionsFormSchema),
    defaultValues: defaults,
  });
  const { register, formState: { errors } } = form;
  const regionsError = errorText(errors.regions?.message);

  return (
    <StepForm step="regions" form={form}>
      <OptionGroup id="regions" legend={t("regions")} hint={t("regionsHint")} error={regionsError}>
        {REGION_CODES.map((code) => (
          <OptionCard key={code} type="checkbox" value={code} defaultChecked={defaults.regions.includes(code)} label={tVocab(`regions.${code}`)} className={code === "CA" ? "sm:col-span-2 lg:col-span-3" : undefined} {...register("regions")} />
        ))}
      </OptionGroup>
    </StepForm>
  );
}
