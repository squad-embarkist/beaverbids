"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Profile } from "@/lib/profile";
import { PROVINCE_CODES, TEAM_SIZE_BANDS } from "@/lib/schemas/vocab";
import { FieldError, FieldHint, FieldLabel, OptionCard, OptionGroup, describedBy, useErrorText } from "../fields";
import { basicsDefaults, basicsFormSchema, type BasicsFormValues } from "../form-schemas";
import { StepForm } from "../step-form";

export function BasicsForm({ profile }: { profile: Profile | null }) {
  const t = useTranslations("Questionnaire.fields");
  const tVocab = useTranslations("Vocab");
  const errorText = useErrorText();
  // Defaults go to useForm and to the inputs themselves, so the server HTML
  // already shows the saved answers before React hydrates.
  const defaults = basicsDefaults(profile);
  const form = useForm<BasicsFormValues, unknown, ReturnType<typeof basicsFormSchema.parse>>({
    resolver: zodResolver(basicsFormSchema),
    defaultValues: defaults,
  });
  const { register, formState: { errors } } = form;
  const nameError = errorText(errors.name?.message);
  const websiteError = errorText(errors.website?.message);
  const provinceError = errorText(errors.headOfficeProvince?.message);
  const capacityError = errorText(errors.capacity?.message);

  return (
    <StepForm step="basics" form={form}>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
        <Input id="name" type="text" autoComplete="organization" required defaultValue={defaults.name} aria-invalid={nameError ? true : undefined} aria-describedby={describedBy("name", undefined, nameError)} {...register("name")} />
        <FieldError id="name-error">{nameError}</FieldError>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="website">{t("website")}</FieldLabel>
        <Input id="website" type="url" inputMode="url" autoComplete="url" placeholder="https://" defaultValue={defaults.website} aria-invalid={websiteError ? true : undefined} aria-describedby={describedBy("website", t("websiteHint"), websiteError)} {...register("website")} />
        <FieldHint id="website-hint">{t("websiteHint")}</FieldHint>
        <FieldError id="website-error">{websiteError}</FieldError>
      </div>

      <div className="flex flex-col gap-2 md:max-w-sm">
        <FieldLabel htmlFor="headOfficeProvince">{t("headOfficeProvince")}</FieldLabel>
        <NativeSelect id="headOfficeProvince" defaultValue={defaults.headOfficeProvince} aria-invalid={provinceError ? true : undefined} aria-describedby={describedBy("headOfficeProvince", undefined, provinceError)} {...register("headOfficeProvince")}>
          <option value="">{t("headOfficePlaceholder")}</option>
          {PROVINCE_CODES.map((code) => (
            <option key={code} value={code}>
              {tVocab(`regions.${code}`)}
            </option>
          ))}
        </NativeSelect>
        <FieldError id="headOfficeProvince-error">{provinceError}</FieldError>
      </div>

      <OptionGroup id="capacity" legend={t("capacity")} error={capacityError} radio>
        {TEAM_SIZE_BANDS.map((band) => (
          <OptionCard key={band} type="radio" value={band} defaultChecked={defaults.capacity === band} label={tVocab(`teamSizes.${band}`)} {...register("capacity")} />
        ))}
      </OptionGroup>
    </StepForm>
  );
}
