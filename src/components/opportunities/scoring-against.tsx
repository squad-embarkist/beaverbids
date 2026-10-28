import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button-link";
import type { Profile } from "@/lib/profile";

// The "Scoring you against" panel from the wireframe: the profile in five
// lines and the way back to the questionnaire.
export async function ScoringAgainst({ profile }: { profile: Profile }) {
  const t = await getTranslations("Opportunities.against");
  const tList = await getTranslations("Opportunities");
  const tVocab = await getTranslations("Vocab");
  const format = await getFormatter();

  const list = (items: string[]) => (items.length ? format.list(items, { type: "conjunction" }) : t("notSet"));
  const min = profile.sizeMin == null ? null : format.number(profile.sizeMin, "cadCompact");
  const max = profile.sizeMax == null ? null : format.number(profile.sizeMax, "cadCompact");
  const size = min && max ? tList("valueRange", { min, max }) : min ? tList("valueFrom", { min }) : max ? tList("valueUpTo", { max }) : t("notSet");

  const rows = [
    { key: "categories", label: t("categories"), value: list(profile.categories.map((c) => tVocab(`categories.${c as "management-consulting"}`))) },
    { key: "buyers", label: t("buyers"), value: list(profile.buyerTypes.map((b) => tVocab(`buyerTypes.${b as "municipal"}`))) },
    { key: "size", label: t("size"), value: size },
    { key: "regions", label: t("regions"), value: list(profile.regions.map((r) => tVocab(`regions.${r as "ON"}`))) },
    { key: "language", label: t("language"), value: tVocab(`languages.${profile.languages}`) },
  ];

  return (
    <section aria-labelledby="scoring-against" className="flex flex-col gap-4 border border-line bg-surface p-5">
      <h2 id="scoring-against" className="label-mono">
        {t("title")}
      </h2>
      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-0.5">
            <dt className="label-mono">{row.label}</dt>
            <dd className="text-sm leading-5 text-asphalt">{row.value}</dd>
          </div>
        ))}
      </dl>
      <ButtonLink href="/questionnaire/basics" variant="secondary" size="sm" className="h-11 self-start">
        {t("edit")}
      </ButtonLink>
    </section>
  );
}
