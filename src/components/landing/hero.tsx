import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Highlight } from "./highlight";

// Hero: stone background, text column with the 6 px signal rule, photo column
// at 527 × 817 with the asphalt overlay and the "6 HRS" figure, then the
// asphalt ticker. The photo stacks under the text below 1024 px.
export async function Hero() {
  const t = await getTranslations("Landing.hero");
  const tTicker = await getTranslations("Landing.ticker");

  return (
    <section aria-labelledby="hero-title" className="border-b border-line bg-stone">
      <div className="mx-auto grid w-full max-w-[1240px] lg:grid-cols-[713fr_527fr]">
        <div className="border-l-[6px] border-signal px-4 py-12 md:px-10 md:py-20">
          <p className="font-mono text-eyebrow tracking-[0.22em] uppercase text-ink-muted">{t("eyebrow")}</p>
          <h1
            id="hero-title"
            className="mt-6 max-w-[627px] font-heading font-expanded font-extrabold text-hero-xs text-asphalt md:text-hero-sm lg:text-hero-md xl:text-hero"
          >
            <span className="block">{t("title")}</span>
            <Highlight lines={[t("highlightLine1"), t("highlightLine2")]} />
          </h1>
          <p className="mt-8 max-w-[512px] text-lead text-asphalt/80">{t("lead")}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#request-a-demo" className={buttonVariants()}>
              {t("primary")}
            </a>
            <a href="#how-it-works" className={buttonVariants({ variant: "secondary" })}>
              {t("secondary")}
            </a>
          </div>
        </div>

        <div className="relative h-[360px] overflow-hidden bg-asphalt md:h-[480px] lg:h-auto">
          <Image
            src="/landing/hero.jpg"
            alt={t("photoAlt")}
            width={527}
            height={817}
            preload
            sizes="(min-width: 1024px) 527px, 100vw"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-asphalt/80 via-asphalt/10 to-asphalt/0"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-8">
            <p className="font-heading font-expanded font-extrabold text-figure-sm text-signal md:text-figure">
              {t("figure")}
            </p>
            <p className="mb-2 w-[101px] font-mono text-eyebrow tracking-[0.18em] uppercase text-paper/90">
              {t("figureCaption")}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-asphalt">
        <ul className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3.5 font-mono text-eyebrow tracking-[0.12em] uppercase text-stone/80 md:px-6">
          <li>
            {tTicker("jobLabel")}
            <span className="text-signal">{tTicker("jobValue")}</span>
          </li>
          <li aria-hidden="true" className="text-ink-muted">
            ·
          </li>
          <li>{tTicker("trade")}</li>
          <li aria-hidden="true" className="text-ink-muted">
            ·
          </li>
          <li>
            {tTicker("closesLabel")}
            <span className="text-signal">{tTicker("closesValue")}</span>
          </li>
          <li aria-hidden="true" className="text-ink-muted">
            ·
          </li>
          <li>{tTicker("value")}</li>
        </ul>
      </div>
    </section>
  );
}
