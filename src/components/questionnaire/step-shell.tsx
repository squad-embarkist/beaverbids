"use client";

import Link from "next/link";
import { cn } from "cn";
import { useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { QUESTIONNAIRE_STEPS, stepNumber, type QuestionnaireStep } from "@/lib/schemas/company-profile";
import { AnswersSoFar } from "./answers-so-far";
import { useQuestionnaireStore } from "./store-provider";
import { WhyWeAsk } from "./why-we-ask";

// The page frame from the onboarding wireframe: the numbered rail, the
// "STEP 02 OF 05" counter, the H1 and value line, the form, and the two
// side panels (under the form on phones). The counter is also announced
// through a visually hidden live region when the step changes.
export function StepShell({ step, children }: { step: QuestionnaireStep; children: React.ReactNode }) {
  const t = useTranslations("Questionnaire");
  const current = stepNumber(step);
  const total = QUESTIONNAIRE_STEPS.length;
  const completed = useQuestionnaireStore((s) => s.profile?.questionnaireStep ?? 0);
  const title = t(`steps.${step}.title`);

  return (
    <>
      <nav aria-label={t("rail.label")} className="bg-stone">
        <ol className="mx-auto flex w-full max-w-[1200px] items-center gap-2 overflow-x-auto px-4 py-4 md:gap-4 md:px-8">
          {QUESTIONNAIRE_STEPS.map((s, index) => {
            const number = index + 1;
            const isCurrent = s === step;
            const isDone = number <= completed;
            const label = (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center border font-mono text-label font-medium",
                    isCurrent ? "border-signal bg-signal text-asphalt" : isDone ? "border-asphalt bg-asphalt text-paper" : "border-ink-muted/60 text-ink-muted",
                  )}
                >
                  {isDone && !isCurrent ? <CheckIcon className="size-4" /> : String(number).padStart(2, "0")}
                </span>
                <span className={cn("font-sans text-sm font-bold uppercase tracking-wide", isCurrent || isDone ? "text-asphalt" : "text-ink-muted", !isCurrent && "hidden md:inline")}>
                  {t(`steps.${s}.title`)}
                </span>
                {isDone ? <span className="sr-only">, {t("rail.completed")}</span> : null}
              </>
            );
            return (
              <li key={s} className="flex items-center gap-2 md:flex-1 md:gap-4">
                {isDone && !isCurrent ? (
                  <Link href={`/questionnaire/${s}`} className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-asphalt">
                    {label}
                  </Link>
                ) : (
                  <span aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-3">
                    {label}
                  </span>
                )}
                {number < total ? <span aria-hidden className="hidden h-px flex-1 bg-asphalt/40 md:block" /> : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <main id="main" className="mx-auto grid w-full max-w-[1200px] flex-1 gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <p aria-live="polite" className="sr-only">
          {t("stepAnnounce", { current, total, title })}
        </p>
        <section className="flex min-w-0 flex-col gap-8 border border-line bg-surface p-5 md:p-10">
          <div className="flex flex-col gap-3">
            <p className="label-mono">{t("stepCounter", { current, total })}</p>
            <h1 className="font-heading font-expanded text-h1 font-extrabold uppercase text-asphalt md:text-display">{t(`steps.${step}.heading`)}</h1>
            <p className="text-base leading-6 text-ink-muted">{t(`steps.${step}.value`)}</p>
          </div>
          {children}
        </section>
        <aside className="flex flex-col gap-6">
          <WhyWeAsk step={step} />
          <AnswersSoFar />
          <div className="bg-asphalt p-6 text-paper">
            <p className="label-mono text-paper/70">{t("afterYouFinish.label")}</p>
            <p className="mt-3 font-heading font-expanded text-h2 font-extrabold uppercase">{t("afterYouFinish.title")}</p>
            <p className="mt-2 text-sm leading-5 text-paper/80">{t("afterYouFinish.body")}</p>
          </div>
        </aside>
      </main>
    </>
  );
}
