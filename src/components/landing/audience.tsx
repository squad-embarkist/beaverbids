import { getTranslations } from "next-intl/server";

const CARDS = ["trades", "certified", "consultants"] as const;

// "Built for the shop, not the enterprise": three tagged cards on stone-light.
export async function Audience() {
  const t = await getTranslations("Landing.audience");

  return (
    <section id="who-its-for" aria-labelledby="audience-title" className="scroll-mt-header border-b border-line bg-paper">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-16 md:px-6 md:py-24">
        <h2
          id="audience-title"
          className="font-heading font-expanded font-extrabold text-section-sm text-asphalt md:text-section"
        >
          <span className="block">{t("titleLine1")}</span>
          <span className="block">{t("titleLine2")}</span>
        </h2>
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {CARDS.map((card) => (
            <li key={card} className="border border-line bg-stone-light p-7">
              <span className="inline-block bg-asphalt px-2 py-1 font-mono text-tag uppercase text-signal">
                {t(`${card}.tag`)}
              </span>
              <h3 className="mt-5 font-condensed font-bold text-card-title uppercase text-asphalt">{t(`${card}.title`)}</h3>
              <p className="mt-3 max-w-[324px] text-body-15 text-asphalt/75">{t(`${card}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
