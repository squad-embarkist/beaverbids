import { getTranslations } from "next-intl/server";
import { demoVideoUrl } from "@/lib/demo-video";
import { DemoVideo } from "./demo-video";

const ITEMS = ["feed", "summaries", "drafts"] as const;

// "Numbers do the persuading": the demo video player at 620 × 611 on the left
// (poster photo, mono label and the signal play button), text column on the
// right.
export async function Demo() {
  const t = await getTranslations("Landing.demo");

  return (
    <section aria-labelledby="demo-title" className="border-b border-line bg-stone">
      <div className="mx-auto grid w-full max-w-[1240px] lg:grid-cols-2">
        <DemoVideo src={demoVideoUrl()} />
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
