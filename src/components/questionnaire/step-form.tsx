"use client";

import { useRef, type ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { stepAfter, stepBefore, type ProfileStepSave, type QuestionnaireStep } from "@/lib/schemas/company-profile";
import { useSaveStep, type SaveDestination } from "./use-save-step";

type Props<TIn extends FieldValues, TOut extends ProfileStepSave["answers"]> = {
  step: QuestionnaireStep;
  form: UseFormReturn<TIn, unknown, TOut>;
  // Steps whose fields are all optional offer Skip, which saves the step as
  // it stands so the progress counter still moves.
  skippable?: boolean;
  children: ReactNode;
};

// The frame every step form shares: the form element, the server error
// line, and the footer with Back, the note, Skip, Save and finish later and
// the one primary button. On phones the footer sticks to the bottom.
export function StepForm<TIn extends FieldValues, TOut extends ProfileStepSave["answers"]>({ step, form, skippable, children }: Props<TIn, TOut>) {
  const t = useTranslations("Questionnaire");
  const { save, pending, error } = useSaveStep(step);
  const destination = useRef<SaveDestination>("next");
  const previous = stepBefore(step);
  const last = stepAfter(step) === null;

  // The ref is read inside the event handler, never during render.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) =>
    form.handleSubmit((answers) => save(answers, destination.current))(event);

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-8">
      {error ? (
        <p role="alert" className="border border-signal bg-signal/5 px-4 py-3 text-base leading-6 text-asphalt">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      <div className="flex flex-col gap-8">{children}</div>

      <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper px-4 py-4 md:static md:mx-0 md:px-6 md:py-5">
        {previous ? (
          <ButtonLink href={`/questionnaire/${previous}`} variant="text" size="sm" className="h-11">
            {t("actions.back")}
          </ButtonLink>
        ) : null}
        <p className="hidden flex-1 text-sm leading-5 text-ink-muted md:block">{t("footerNote")}</p>
        <Button
          type="submit"
          variant="text"
          size="sm"
          className="h-11"
          disabled={pending}
          onClick={() => {
            destination.current = "list";
          }}
        >
          {t("actions.saveLater")}
        </Button>
        {skippable && !last ? (
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="h-11"
            disabled={pending}
            onClick={() => {
              destination.current = "next";
            }}
          >
            {t("actions.skip")}
          </Button>
        ) : null}
        <Button
          type="submit"
          size="sm"
          className="h-11 min-w-40 flex-1 sm:flex-none"
          disabled={pending}
          onClick={() => {
            destination.current = "next";
          }}
        >
          {pending ? t("actions.saving") : last ? t("actions.finish") : t("actions.continue")}
        </Button>
      </div>
    </form>
  );
}
