import { getTranslations } from "next-intl/server";
import { Highlight } from "./highlight";

const STATS = ["portals", "missed", "leadTime", "spent"] as const;

// "The problem": eyebrow and highlighted H2 on the left, a 2 × 2 grid of
// stats with a 2 px asphalt rule above each on the right.
export async function Problem() {
  const t = await getTranslations("Landing.problem");

  return (
    <section aria-labelledby="problem-title" className="border-b border-line bg-paper">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[508fr_620fr] lg:gap-16">
        <div>
          <p className="font-mono text-eyebrow uppercase text-ink-muted">{t("eyebrow")}</p>
          <h2
            id="problem-title"
            className="mt-4 font-heading font-expanded font-extrabold text-section-sm text-asphalt md:text-section"
          >
            <span className="block">{t("titleLine1")}</span>
            <span className="block">{t("titleLine2")}</span>
            <Highlight lines={[t("highlightLine1"), t("highlightLine2")]} />
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-6 md:gap-8">
          {STATS.map((stat) => (
            <li key={stat} className="border-t-2 border-asphalt pt-4">
              <p className="font-heading font-expanded font-extrabold text-figure-sm text-asphalt md:text-section">
                {t(`stats.${stat}.figure`)}
              </p>
              <p className="mt-2 max-w-[177px] text-caption text-asphalt/70">{t(`stats.${stat}.caption`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
