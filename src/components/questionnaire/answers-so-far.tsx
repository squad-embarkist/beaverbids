"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button-link";
import type { Profile } from "@/lib/profile";
import { useQuestionnaireStore } from "./store-provider";

// A short recap of what is saved so far, fed by the store so it updates
// the moment a step is saved. Hidden until the first save.
export function AnswersSoFar() {
  const t = useTranslations("Questionnaire.answersSoFar");
  const tVocab = useTranslations("Vocab");
  const format = useFormatter();
  const profile = useQuestionnaireStore((s) => s.profile);

  if (!profile) return null;

  const sizeText = ({ sizeMin, sizeMax }: Profile): string => {
    if (sizeMin == null && sizeMax == null) return t("notSet");
    const min = sizeMin == null ? null : format.number(sizeMin, "cadCompact");
    const max = sizeMax == null ? null : format.number(sizeMax, "cadCompact");
    if (min && max) return t("sizeRange", { min, max });
    return min ? t("sizeFrom", { min }) : t("sizeUpTo", { max: max ?? "" });
  };

  const rows: { key: string; label: string; value: string }[] = [
    { key: "company", label: t("company"), value: profile.name },
    {
      key: "headOffice",
      label: t("headOffice"),
      value: profile.headOfficeProvince ? tVocab(`regions.${profile.headOfficeProvince as "ON"}`) : t("notSet"),
    },
    { key: "teamSize", label: t("teamSize"), value: profile.capacity ? tVocab(`teamSizes.${profile.capacity as "1-5"}`) : t("notSet") },
  ];
  if (profile.questionnaireStep >= 2) {
    rows.push({
      key: "categories",
      label: t("categories"),
      value: profile.categories.length ? profile.categories.map((c) => tVocab(`categories.${c as "management-consulting"}`)).join(", ") : t("notSet"),
    });
  }
  if (profile.questionnaireStep >= 3) {
    rows.push({
      key: "regions",
      label: t("regions"),
      value: profile.regions.length ? profile.regions.map((r) => tVocab(`regions.${r as "ON"}`)).join(", ") : t("notSet"),
    });
  }
  if (profile.questionnaireStep >= 4) {
    rows.push({ key: "size", label: t("size"), value: sizeText(profile) });
  }

  return (
    <section aria-labelledby="answers-so-far" className="flex flex-col gap-4 border border-line bg-surface p-6">
      <h2 id="answers-so-far" className="label-mono">
        {t("title")}
      </h2>
      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-0.5">
            <dt className="label-mono">{row.label}</dt>
            <dd className="text-base leading-6 font-semibold text-asphalt">{row.value}</dd>
          </div>
        ))}
      </dl>
      <ButtonLink href="/questionnaire/basics" variant="secondary" size="sm" className="self-start">
        {t("edit", { number: "01" })}
      </ButtonLink>
    </section>
  );
}
