import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { getFormatter, getTranslations } from "next-intl/server";
import { FitAssessment } from "@/components/opportunities/fit-assessment";
import { NoticeLink } from "@/components/opportunities/notice-link";
import { ScorePanel } from "@/components/score/score-panel";
import { CLOSING_SOON_DAYS, daysUntil } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getOpportunity, type OpportunityItem } from "@/lib/opportunities";
import { getProfile } from "@/lib/profile";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/opportunities/[id]">): Promise<Metadata> {
  const { id } = await params;
  const tender = await prisma.tender.findUnique({ where: { id }, select: { title: true } });
  return { title: tender?.title ?? "" };
}

// Listing detail: the notice facts, the score panel with the five bars,
// the fit assessment and the link out to the official notice. The app
// never hosts tender documents.
export default function ListingPage({ params }: PageProps<"/opportunities/[id]">) {
  return (
    <main id="main" className="flex-1">
      <Suspense fallback={<ListingSkeleton />}>
        <ListingContent params={params} />
      </Suspense>
    </main>
  );
}

async function ListingContent({ params }: { params: PageProps<"/opportunities/[id]">["params"] }) {
  const [user, { id }] = await Promise.all([getCurrentUser(), params]);
  const profile = await getProfile(prisma, user.id);
  const item = await getOpportunity(prisma, { id, profileId: profile?.id ?? null });
  if (!item) notFound();

  const t = await getTranslations("Listing");
  const tVocab = await getTranslations("Vocab");
  const tList = await getTranslations("Opportunities");
  const format = await getFormatter();
  const now = new Date();
  const days = daysUntil(item.closesAt, now);
  const closesAt = new Date(item.closesAt);
  const region = tVocab(`regions.${item.region as "ON"}`);
  const value = valueText(item, (n) => format.number(n, "cadCompact"), tList);
  const score = item.score;
  const reasons = !score.placeholder && score.eligible ? score.reasons : null;

  return (
    <>
      <header className="bg-stone">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 md:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4">
            <nav aria-label={t("breadcrumb.label")} className="font-mono text-label text-ink-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/opportunities" className="text-asphalt underline underline-offset-4">
                    {t("breadcrumb.opportunities")}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>{t("breadcrumb.ref", { id: item.externalId })}</li>
                <li aria-hidden>/</li>
                <li>{item.source.name}</li>
              </ol>
            </nav>
            <h1 className="font-heading font-expanded text-h1 font-extrabold uppercase text-asphalt md:text-display">{item.title}</h1>
            <p className="font-mono text-sm text-asphalt">
              {t("metaLine", { buyer: item.buyer, region, value, date: format.dateTime(new Date(item.publishedAt), "short") })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-stretch">
            <div className="flex flex-col justify-center gap-1 bg-asphalt px-5 py-4 text-paper">
              <p className="font-mono text-label text-paper/70">{t("closing.date", { date: format.dateTime(closesAt, "short") })}</p>
              <p className={cn("font-heading font-expanded text-h2 font-extrabold uppercase", days <= CLOSING_SOON_DAYS ? "text-signal" : "text-paper")}>{t("closing.daysLeft", { days })}</p>
            </div>
            <div className="flex items-stretch">
              <NoticeLink item={item} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="order-2 flex min-w-0 flex-col gap-8 lg:order-1">
          <section aria-labelledby="notice-text" className="flex flex-col gap-4 border border-line bg-surface p-6">
            <h2 id="notice-text" className="label-mono">
              {t("details.description")}
            </h2>
            <p className="text-base leading-6 whitespace-pre-line text-asphalt">{item.description}</p>
          </section>

          <section aria-labelledby="notice-facts" className="flex flex-col gap-4 border border-line bg-surface p-6">
            <h2 id="notice-facts" className="label-mono">
              {t("details.title")}
            </h2>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Fact label={t("details.buyer")} value={item.buyer} />
              <Fact label={t("details.buyerType")} value={item.buyerType ? tVocab(`buyerTypes.${item.buyerType as "municipal"}`) : null} />
              <Fact label={t("details.region")} value={region} />
              <Fact label={t("details.value")} value={value} mono />
              <Fact label={t("details.published")} value={format.dateTime(new Date(item.publishedAt), "short")} mono />
              <Fact label={t("details.closes")} value={format.dateTime(closesAt, "short")} mono />
              <Fact label={t("details.language")} value={tVocab(`languages.${item.language as "EN"}`)} />
              <Fact label={t("details.reference")} value={item.externalId} mono />
              <Fact label={t("details.source")} value={item.source.name} />
              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="label-mono">{t("details.categories")}</dt>
                <dd className="flex flex-wrap gap-2">
                  {item.categoryCodes.length ? (
                    item.categoryCodes.map((code) => (
                      <span key={code} className="border border-line px-2 py-1 font-mono text-label text-asphalt">
                        {tVocab(`categories.${code as "management-consulting"}`)}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm leading-5 text-ink-muted">{t("details.noCategories")}</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="order-1 flex flex-col gap-6 lg:order-2">
          <ScorePanel score={score} />
          {reasons ? <FitAssessment reasons={reasons} /> : null}
        </aside>
      </div>
    </>
  );
}

function valueText(item: OpportunityItem, money: (n: number) => string, t: Awaited<ReturnType<typeof getTranslations<"Opportunities">>>): string {
  if (item.valueMin != null && item.valueMax != null) {
    return item.valueMin === item.valueMax ? money(item.valueMin) : t("valueRange", { min: money(item.valueMin), max: money(item.valueMax) });
  }
  if (item.valueMin != null) return t("valueFrom", { min: money(item.valueMin) });
  if (item.valueMax != null) return t("valueUpTo", { max: money(item.valueMax) });
  return t("valueNotStated");
}

function Fact({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <dt className="label-mono">{label}</dt>
      <dd className={cn("text-base leading-6 text-asphalt", mono && "font-mono text-sm")}>{value}</dd>
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="bg-stone">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-8 md:px-8">
          <div className="h-4 w-64 bg-line" />
          <div className="h-10 w-3/4 bg-line" />
          <div className="h-4 w-96 max-w-full bg-line" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-96 bg-line" />
        <div className="h-96 bg-line" />
      </div>
    </div>
  );
}
