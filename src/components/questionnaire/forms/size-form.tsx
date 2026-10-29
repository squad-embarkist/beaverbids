"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/lib/profile";
import { FieldError, FieldHint, FieldLabel, describedBy, useErrorText } from "../fields";
import { sizeDefaults, sizeFormSchema, type SizeFormValues } from "../form-schemas";
import { StepForm } from "../step-form";

export function SizeForm({ profile }: { profile: Profile | null }) {
  const t = useTranslations("Questionnaire.fields");
  const errorText = useErrorText();
  const defaults = sizeDefaults(profile);
  const form = useForm<SizeFormValues, unknown, ReturnType<typeof sizeFormSchema.parse>>({
    resolver: zodResolver(sizeFormSchema),
    defaultValues: defaults,
  });
  const { register, formState: { errors } } = form;
  const minError = errorText(errors.sizeMin?.message);
  const maxError = errorText(errors.sizeMax?.message);
  const timelineError = errorText(errors.timelinePref?.message);

  return (
    <StepForm step="size" form={form} skippable>
      <div className="grid gap-6 md:grid-cols-2">
        <MoneyField id="sizeMin" label={t("sizeMin")} hint={t("sizeHint")} error={minError} defaultValue={defaults.sizeMin} {...register("sizeMin")} />
        <MoneyField id="sizeMax" label={t("sizeMax")} hint={t("sizeHint")} error={maxError} defaultValue={defaults.sizeMax} {...register("sizeMax")} />
      </div>

      <div className="flex flex-col gap-2 md:max-w-xs">
        <FieldLabel htmlFor="timelinePref">{t("timelinePref")}</FieldLabel>
        <Input id="timelinePref" type="text" inputMode="numeric" defaultValue={defaults.timelinePref} aria-invalid={timelineError ? true : undefined} aria-describedby={describedBy("timelinePref", t("timelineHint"), timelineError)} {...register("timelinePref")} />
        <FieldHint id="timelinePref-hint">{t("timelineHint")}</FieldHint>
        <FieldError id="timelinePref-error">{timelineError}</FieldError>
      </div>
    </StepForm>
  );
}

function MoneyField({ id, label, hint, error, ...input }: React.ComponentProps<"input"> & { id: string; label: string; hint: string; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-ink-muted">
          $
        </span>
        <Input id={id} type="text" inputMode="numeric" className="pl-8" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input} />
      </div>
      <FieldHint id={`${id}-hint`}>{hint}</FieldHint>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
