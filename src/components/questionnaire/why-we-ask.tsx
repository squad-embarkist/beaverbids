"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import type { QuestionnaireStep } from "@/lib/schemas/company-profile";
import { FACTOR_KEYS, FACTOR_MAX, type FactorKey } from "@/lib/scoring/types";

// The five weights, with the factor this step feeds highlighted.
const STEP_FACTOR: Record<QuestionnaireStep, FactorKey> = {
  basics: "location",
  work: "category",
  regions: "location",
  size: "size",
  credentials: "credentials",
};

export function WhyWeAsk({ step }: { step: QuestionnaireStep }) {
  const t = useTranslations("Questionnaire.whyWeAsk");
  const total = 100;

  return (
    <section aria-labelledby="why-we-ask" className="flex flex-col gap-4 border border-line bg-surface p-6">
      <h2 id="why-we-ask" className="label-mono">
        {t("title")}
      </h2>
      <ul className="flex flex-col gap-3">
        {FACTOR_KEYS.map((key) => {
          const max = FACTOR_MAX[key];
          const highlighted = STEP_FACTOR[step] === key;
          return (
            <li key={key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm leading-5">
                <span className={cn(highlighted ? "font-bold text-asphalt" : "text-asphalt")}>{t(`weights.${key}`)}</span>
                <span className="font-mono text-ink-muted">{t("points", { points: max })}</span>
              </div>
              <div aria-hidden className="h-1 w-full bg-line">
                <div className={cn("h-full", highlighted ? "bg-signal" : "bg-asphalt")} style={{ width: `${(max / total) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
