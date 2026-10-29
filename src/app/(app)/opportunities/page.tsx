import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Filters } from "@/components/opportunities/filters";
import { OpportunityList } from "@/components/opportunities/list";
import { LoadMore } from "@/components/opportunities/load-more";
import { hasFilters, opportunitiesHref, parseQuery, queryParams } from "@/components/opportunities/query-url";
import { ScoringAgainst } from "@/components/opportunities/scoring-against";
import { prisma } from "@/lib/db";
import { listOpportunities } from "@/lib/opportunities";
import { getProfile } from "@/lib/profile";
import { nextIncompleteStep } from "@/lib/schemas/company-profile";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Opportunities");
  return { title: t("title") };
}

// The scored list. The static shell is the heading; filters, rows and the
// profile panel stream in behind Suspense because they read the session
// and searchParams. The server calls listOpportunities directly, the same
// function GET /api/opportunities uses.
export default function OpportunitiesPage({ searchParams }: PageProps<"/opportunities">) {
  return (
    <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8">
      <Suspense fallback={<OpportunitiesSkeleton />}>
        <OpportunitiesContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function OpportunitiesContent({ searchParams }: { searchParams: PageProps<"/opportunities">["searchParams"] }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const profile = await getProfile(prisma, user.id);
  const pending = nextIncompleteStep(profile?.questionnaireStep ?? 0);
  if (pending || !profile) redirect(`/questionnaire/${pending ?? "basics"}`);

  const query = parseQuery(params);
  const now = new Date();
  const [page, scoreCount] = await Promise.all([
    listOpportunities(prisma, { query, profileId: profile.id, now }),
    prisma.score.count({ where: { profileId: profile.id } }),
  ]);
  const t = await getTranslations("Opportunities");

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2 lg:col-span-2">
        <h1 className="font-heading font-expanded text-h1 font-extrabold uppercase text-asphalt md:text-display">{t("title")}</h1>
        <p className="label-mono">{t("subtitle")}</p>
      </div>

      {/* Filters come first in the DOM so the tab order runs filters, then rows, then the profile panel; phones show the rows first. */}
      <aside className="order-2 flex flex-col gap-6 lg:order-1">
        <Filters query={query} />
        <ScoringAgainst profile={profile} />
      </aside>

      <section aria-label={t("listLabel")} className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
        {page.items.length === 0 ? (
          <EmptyState scored={scoreCount > 0} filtered={hasFilters(query)} />
        ) : (
          <>
            <OpportunityList items={page.items} now={now} />
            {page.nextCursor ? (
              <LoadMore
                baseSearch={queryParams({ ...query, cursor: undefined }).toString()}
                cursor={page.nextCursor}
                fallbackHref={opportunitiesHref(query, { cursor: page.nextCursor })}
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

async function EmptyState({ scored, filtered }: { scored: boolean; filtered: boolean }) {
  const t = await getTranslations("Opportunities");
  const kind = !scored ? "scoring" : "filters";
  return (
    <div className="flex flex-col gap-3 border border-line bg-surface p-6">
      <h2 className="font-heading text-h2 font-semibold text-asphalt">{t(`empty.${kind}Title`)}</h2>
      <p className="text-base leading-6 text-asphalt">{t(`empty.${kind}Body`)}</p>
      {filtered ? (
        <Link href="/opportunities" className="self-start text-sm leading-5 text-asphalt underline underline-offset-4">
          {t("filters.clear")}
        </Link>
      ) : null}
    </div>
  );
}

// Skeleton rows that match the table, never a lone spinner.
function OpportunitiesSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-8">
      <div className="h-10 w-96 max-w-full bg-line" />
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden h-96 bg-line lg:block" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-line" />
          ))}
        </div>
      </div>
    </div>
  );
}
