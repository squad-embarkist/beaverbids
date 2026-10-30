import Link from "next/link";
import { cn } from "cn";
import { getTranslations } from "next-intl/server";
import { getReasonText } from "@/components/score/reason-text-server";
import { BAND_FILL } from "@/components/score/score-chip";
import type { ScoreSummary } from "@/lib/opportunities";
import { FACTOR_KEYS, FACTOR_MAX } from "@/lib/scoring/types";

// The asphalt score card from the listing wireframe: the /100 figure in
// signal red with the band word, then the five factor bars in the fixed
// order, each a meter with its points beside it, so colour is never the
// only cue. A capped score says so; a tender that failed the gate shows
// "Not eligible" and its rule-out reasons instead of a number.
export async function ScorePanel({ score }: { score: ScoreSummary }) {
  const t = await getTranslations("Listing.score");
  const tVocab = await getTranslations("Vocab.bands");

  if (score.placeholder) {
    return (
      <Panel title={t("title")}>
        <p className="font-heading text-h2 font-semibold">{t("pending")}</p>
        <p className="text-sm leading-5 text-paper/80">{t("pendingBody")}</p>
      </Panel>
    );
  }

  if (!score.eligible) {
    const reasonText = await getReasonText();
    const ruleOut = score.reasons?.ruleOut ?? [];
    return (
      <Panel title={t("title")}>
        <p className="font-heading font-expanded text-h1 font-extrabold uppercase">{t("ineligible")}</p>
        <p className="text-sm leading-5 text-paper/80">{t("ineligibleBody")}</p>
        {ruleOut.length ? (
          <ul className="flex flex-col gap-2 border-t border-line-dark pt-4">
            {ruleOut.map((reason, i) => (
              <li key={i} className="flex gap-3 text-sm leading-5">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 bg-signal" />
                {reasonText(reason)}
              </li>
            ))}
          </ul>
        ) : null}
        <Basis />
      </Panel>
    );
  }

  const cap = score.reasons?.gaps.find((r) => r.code === "categoryCap");
  const factors = score.factors;

  return (
    <Panel title={t("title")}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="flex items-baseline gap-2">
          <span className="font-heading font-expanded text-score font-extrabold leading-none text-signal tabular-nums">{score.total}</span>
          <span className="font-mono text-base text-paper/70">{t("outOf")}</span>
        </p>
        <p className="font-heading font-expanded text-h2 font-extrabold uppercase">{tVocab(score.band)}</p>
      </div>

      {cap ? <p className="border-l-4 border-signal pl-3 text-sm leading-5 text-paper/90">{t("capNote", { limit: typeof cap.params.limit === "number" ? cap.params.limit : 49 })}</p> : null}

      {factors ? (
        <ul className="flex flex-col gap-4">
          {FACTOR_KEYS.map((key) => {
            const points = factors[key];
            const max = FACTOR_MAX[key];
            const label = t(`factors.${key}`);
            return (
              <li key={key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm leading-5">
                  <span id={`factor-${key}`}>{label}</span>
                  <span className="font-mono tabular-nums">{t("factorValue", { points, max })}</span>
                </div>
                <div role="meter" aria-labelledby={`factor-${key}`} aria-valuenow={points} aria-valuemin={0} aria-valuemax={max} className="h-1.5 w-full bg-line-dark">
                  <div className={cn("h-full", BAND_FILL[score.band])} style={{ width: `${(points / max) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Basis />
    </Panel>
  );
}

async function Basis() {
  const t = await getTranslations("Listing.score");
  return (
    <p className="border-t border-line-dark pt-4 text-sm leading-5 text-paper/70">
      {t("basis")}{" "}
      <Link href="/questionnaire/basics" className="text-paper underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-paper">
        {t("update")}
      </Link>
    </p>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="score-panel" className="flex flex-col gap-5 bg-asphalt p-6 text-paper">
      <h2 id="score-panel" className="label-mono text-paper/70">
        {title}
      </h2>
      {children}
    </section>
  );
}
