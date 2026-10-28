import Image from "next/image";
import { getTranslations } from "next-intl/server";

const ITEMS = ["feed", "summaries", "drafts"] as const;

// "Numbers do the persuading": the demo photo at 620 × 611 with its mono
// label (no play button until there is a video), text column on the right.
export async function Demo() {
  const t = await getTranslations("Landing.demo");

  return (
    <section aria-labelledby="demo-title" className="border-b border-line bg-stone">
      <div className="mx-auto grid w-full max-w-[1240px] lg:grid-cols-2">
        <div className="relative h-[320px] overflow-hidden bg-asphalt md:h-[480px] lg:h-auto lg:min-h-[611px]">
          <Image
            src="/landing/demo.jpg"
            alt={t("photoAlt")}
            width={620}
            height={611}
            sizes="(min-width: 1024px) 620px, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <p className="absolute bottom-4 left-4 font-mono text-mono-xs uppercase text-paper">{t("label")}</p>
        </div>
        <div className="px-4 py-12 md:px-12 md:py-20">
          <p className="font-mono text-eyebrow uppercase text-ink-muted">{t("eyebrow")}</p>
          <h2
            id="demo-title"
            className="mt-4 max-w-[524px] font-heading font-expanded font-extrabold text-section-sm text-asphalt md:text-section-lg"
          >
            {t("title")}
          </h2>
          <p className="mt-6 max-w-[448px] text-lead text-asphalt/80">{t("lead")}</p>
          <ul className="mt-8 flex max-w-[524px] flex-col gap-3">
            {ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-signal" />
                <span className="text-list-15 text-asphalt/85">{t(`items.${item}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
