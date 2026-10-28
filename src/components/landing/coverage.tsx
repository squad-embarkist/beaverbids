import { getTranslations } from "next-intl/server";
import { Highlight } from "./highlight";

const PORTALS = ["canadabuys", "merx", "bcbid", "ontario", "seao", "nbon", "apc", "bidsandtenders"] as const;

// "Every portal, one feed": asphalt section with the 4 × 2 hairline grid of
// portal names (2 × 4 below 1024 px).
export async function Coverage() {
  const t = await getTranslations("Landing.coverage");

  return (
    <section id="portals" aria-labelledby="coverage-title" className="scroll-mt-header border-b border-line bg-asphalt">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 py-16 md:px-6 md:py-20 lg:grid-cols-[461fr_691fr] lg:items-center">
        <div>
          <p className="font-mono text-eyebrow uppercase text-ink-muted">{t("eyebrow")}</p>
          <h2
            id="coverage-title"
            className="mt-4 font-heading font-expanded font-extrabold text-section-sm text-paper md:text-section"
          >
            <span className="block">{t("titleLine1")}</span>
            <Highlight lines={[t("highlight")]} />
          </h2>
          <p className="mt-6 max-w-[384px] text-coverage-lead text-stone/75">{t("lead")}</p>
        </div>
        <ul className="grid grid-cols-2 gap-px bg-line-dark lg:grid-cols-4">
          {PORTALS.map((portal) => (
            <li key={portal} className="flex min-h-[92px] items-center bg-asphalt p-4">
              <span className="font-condensed font-bold text-portal uppercase text-stone">{t(`portals.${portal}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
