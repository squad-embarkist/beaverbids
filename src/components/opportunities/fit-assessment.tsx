import { cn } from "cn";
import { getTranslations } from "next-intl/server";
import { getReasonText } from "@/components/score/reason-text-server";
import type { ReasonSet } from "@/lib/scoring/reasons";

const LISTS = [
  { key: "inFavour", marker: "bg-asphalt" },
  { key: "gaps", marker: "bg-ink-muted" },
  { key: "ruleOut", marker: "bg-signal" },
] as const;

// The three reason lists, each omitted when empty, every line rendered
// from the next-intl message keyed by its reason code.
export async function FitAssessment({ reasons }: { reasons: ReasonSet }) {
  const t = await getTranslations("Listing.assessment");
  const reasonText = await getReasonText();
  const lists = LISTS.filter(({ key }) => reasons[key].length > 0);
  if (lists.length === 0) return null;

  return (
    <section aria-labelledby="fit-assessment" className="flex flex-col gap-5 border border-line bg-surface p-6">
      <h2 id="fit-assessment" className="label-mono">
        {t("title")}
      </h2>
      {lists.map(({ key, marker }) => (
        <div key={key} className="flex flex-col gap-2">
          <h3 className="font-sans text-sm leading-5 font-bold uppercase tracking-wide text-asphalt">{t(key)}</h3>
          <ul className="flex flex-col gap-2">
            {reasons[key].map((reason, i) => (
              <li key={`${reason.code}-${i}`} className="flex gap-3 text-base leading-6 text-asphalt">
                <span aria-hidden className={cn("mt-2 size-2 shrink-0", marker)} />
                <span>{reasonText(reason)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
