"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/profile";
import { BUYER_TYPE_CODES, CATEGORY_CODES, LANGUAGE_CODES } from "@/lib/schemas/vocab";
import { FieldError, FieldLabel, OptionCard, OptionGroup, describedBy, useErrorText } from "../fields";
import { workDefaults, workFormSchema, type WorkFormValues } from "../form-schemas";
import { StepForm } from "../step-form";

export function WorkForm({ profile }: { profile: Profile | null }) {
  const t = useTranslations("Questionnaire.fields");
  const tVocab = useTranslations("Vocab");
  const errorText = useErrorText();
  const defaults = workDefaults(profile);
  const form = useForm<WorkFormValues, unknown, ReturnType<typeof workFormSchema.parse>>({
    resolver: zodResolver(workFormSchema),
    defaultValues: defaults,
  });
  const { register, formState: { errors } } = form;
  const categoriesError = errorText(errors.categories?.message);
  const descriptionError = errorText(errors.description?.message);
  const languagesError = errorText(errors.languages?.message);

  return (
    <StepForm step="work" form={form}>
      <OptionGroup id="categories" legend={t("categories")} hint={t("categoriesHint")} error={categoriesError}>
        {CATEGORY_CODES.map((code) => (
          <OptionCard key={code} type="checkbox" value={code} defaultChecked={defaults.categories.includes(code)} label={tVocab(`categories.${code}`)} {...register("categories")} />
        ))}
      </OptionGroup>

      <OptionGroup id="buyerTypes" legend={t("buyerTypes")} hint={t("buyerTypesHint")}>
        {BUYER_TYPE_CODES.map((code) => (
          <OptionCard key={code} type="checkbox" value={code} defaultChecked={defaults.buyerTypes.includes(code)} label={tVocab(`buyerTypes.${code}`)} {...register("buyerTypes")} />
        ))}
      </OptionGroup>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="description">{t("description")}</FieldLabel>
        <Textarea id="description" rows={4} defaultValue={defaults.description} placeholder={t("descriptionPlaceholder")} aria-invalid={descriptionError ? true : undefined} aria-describedby={describedBy("description", undefined, descriptionError)} {...register("description")} />
        <FieldError id="description-error">{descriptionError}</FieldError>
      </div>

      <OptionGroup id="languages" legend={t("languages")} error={languagesError} radio>
        {LANGUAGE_CODES.map((code) => (
          <OptionCard key={code} type="radio" value={code} defaultChecked={defaults.languages === code} label={tVocab(`languages.${code}`)} {...register("languages")} />
        ))}
      </OptionGroup>
    </StepForm>
  );
}
