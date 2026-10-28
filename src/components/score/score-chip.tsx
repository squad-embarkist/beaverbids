import { cn } from "cn";
import { getTranslations } from "next-intl/server";
import type { ScoreSummary } from "@/lib/opportunities";
import type { ScoreBand } from "@/lib/schemas/vocab";

// The fit score as a chip: the number in expanded Archivo with "/100" in
// mono, the band word, and the band colour on the border and the little
// bar. The number and the word stay asphalt because the medium and low
// band colours fall under 4.5:1 on white for small text; the colour is the
// third cue, never the only one. Chips are the one rounded shape.

export const BAND_BORDER: Record<ScoreBand, string> = {
  HIGH: "border-band-high",
  MEDIUM: "border-band-medium",
  LOW: "border-band-low",
};

export const BAND_FILL: Record<ScoreBand, string> = {
  HIGH: "bg-band-high",
  MEDIUM: "bg-band-medium",
  LOW: "bg-band-low",
};

export async function ScoreChip({ score, className }: { score: ScoreSummary; className?: string }) {
  const t = await getTranslations("Opportunities.chip");
  const tVocab = await getTranslations("Vocab.bands");

  if (score.placeholder) {
    return (
      <span className={cn("inline-flex min-h-11 w-24 items-center justify-center rounded-[6px] border border-dashed border-ink-muted/60 px-2 font-mono text-label text-ink-muted", className)}>
        {t("scoring")}
      </span>
    );
  }

  if (!score.eligible) {
    return (
      <span className={cn("inline-flex min-h-11 w-24 items-center justify-center rounded-[6px] border border-asphalt/40 px-2 text-center font-mono text-label text-asphalt", className)}>
        {t("notEligible")}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex w-24 flex-col gap-1 rounded-[6px] border-2 bg-surface px-3 py-2", BAND_BORDER[score.band], className)}>
      <span className="flex items-baseline gap-1">
        <span className="font-heading font-expanded text-score-sm font-extrabold tabular-nums text-asphalt">{score.total}</span>
        <span className="font-mono text-label text-ink-muted">{t("outOf")}</span>
      </span>
      <span aria-hidden className="h-1 w-full bg-line">
        <span className={cn("block h-full", BAND_FILL[score.band])} style={{ width: `${score.total}%` }} />
      </span>
      <span className="font-mono text-label text-asphalt">{tVocab(score.band)}</span>
    </span>
  );
}
