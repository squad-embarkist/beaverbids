import { getTranslations } from "next-intl/server";

const STEPS = ["watch", "filter", "draft"] as const;

// "Three steps. One inbox.": asphalt section, heading row, then three cells
// separated by 1 px hairlines (a tinted parent with 1 px gaps).
export async function Steps() {
  const t = await getTranslations("Landing.steps");

  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="scroll-mt-header border-b border-line bg-asphalt">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-16 md:px-6 md:py-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2
            id="steps-title"
            className="font-heading font-expanded font-extrabold text-section-sm text-paper md:text-section"
          >
            {t("title")}
          </h2>
          <p className="font-mono text-eyebrow tracking-[0.18em] uppercase text-ink-muted">{t("eyebrow")}</p>
        </div>
        <ol className="mt-12 grid gap-px bg-line-dark lg:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step} className="bg-asphalt p-8">
              <div className="flex items-center gap-3">
                <span className="font-mono text-step text-signal">{t(`${step}.number`)}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-ink-muted/40" />
              </div>
              <h3 className="mt-6 font-condensed font-bold text-card-title uppercase text-paper">{t(`${step}.title`)}</h3>
              <p className="mt-4 max-w-[333px] text-body-15 text-stone/75">{t(`${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
