import Link from "next/link";
import { cn } from "cn";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { OPPORTUNITIES_DEFAULT_LIMIT, type OpportunitiesQuery } from "@/lib/schemas/opportunities";
import { CATEGORY_CODES, PROVINCE_CODES, SCORE_BANDS } from "@/lib/schemas/vocab";
import { RotateCcwIcon } from "lucide-react";
import { activeFilterCount, opportunitiesHref } from "./query-url";

const CLOSING_OPTIONS = [7, 14, 30, 60];

// A plain GET form, so the filters work without JavaScript and with the
// keyboard; the band chips are links that toggle one parameter. State
// lives in the URL, which is what the query schema already parses.
export async function Filters({ query }: { query: OpportunitiesQuery }) {
  const t = await getTranslations("Opportunities.filters");
  const tVocab = await getTranslations("Vocab");
  const active = activeFilterCount(query);

  return (
    <section aria-labelledby="filters-title" className="flex flex-col gap-6 border border-line bg-surface p-5">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id="filters-title" className="label-mono">
          {t("title")}
        </h2>
        {active > 0 ? (
          <ButtonLink href="/opportunities" variant="text" size="sm" className="h-11 gap-1.5 px-2 text-asphalt">
            <RotateCcwIcon aria-hidden className="size-3.5" />
            {t("reset", { count: active })}
          </ButtonLink>
        ) : null}
      </div>

      <nav aria-label={t("bands")} className="flex flex-col gap-2">
        <p className="label-mono">{t("bands")}</p>
        <ul className="flex flex-wrap gap-2">
          <li>
            <BandChip href={opportunitiesHref(query, { band: null })} active={!query.band} label={t("allBands")} />
          </li>
          {SCORE_BANDS.map((band) => (
            <li key={band}>
              <BandChip href={opportunitiesHref(query, { band })} active={query.band === band} label={tVocab(`bands.${band}`)} />
            </li>
          ))}
        </ul>
      </nav>

      <form method="get" action="/opportunities" className="flex flex-col gap-5 border-t border-line pt-5">
        {query.includeIneligible ? <input type="hidden" name="includeIneligible" value="true" /> : null}
        {query.band ? <input type="hidden" name="band" value={query.band} /> : null}
        {query.limit !== OPPORTUNITIES_DEFAULT_LIMIT ? <input type="hidden" name="limit" value={query.limit} /> : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="q" className="label-mono">
            {t("search")}
          </label>
          <Input id="q" name="q" type="search" defaultValue={query.q ?? ""} placeholder={t("searchPlaceholder")} className="h-11 text-sm" />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="category" className="label-mono">
            {t("category")}
          </label>
          <NativeSelect id="category" name="category" defaultValue={query.category ?? ""} className="h-11 text-sm">
            <option value="">{t("anyCategory")}</option>
            {CATEGORY_CODES.map((code) => (
              <option key={code} value={code}>
                {tVocab(`categories.${code}`)}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="region" className="label-mono">
            {t("province")}
          </label>
          <NativeSelect id="region" name="region" defaultValue={query.region ?? ""} className="h-11 text-sm">
            <option value="">{t("anyProvince")}</option>
            {PROVINCE_CODES.map((code) => (
              <option key={code} value={code}>
                {tVocab(`regions.${code}`)}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="closingWithin" className="label-mono">
              {t("closingWithin")}
            </label>
            <NativeSelect id="closingWithin" name="closingWithin" defaultValue={query.closingWithin == null ? "" : String(query.closingWithin)} className="h-11 text-sm">
              <option value="">{t("anyTime")}</option>
              {CLOSING_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {t("days", { days })}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="sort" className="label-mono">
              {t("sort")}
            </label>
            <NativeSelect id="sort" name="sort" defaultValue={query.sort} className="h-11 text-sm">
              <option value="score">{t("sortScore")}</option>
              <option value="closing">{t("sortClosing")}</option>
            </NativeSelect>
          </div>
        </div>

        <Button type="submit" variant="secondary" size="sm" className="h-11 w-full border-asphalt bg-asphalt text-paper hover:bg-asphalt/90">
          {t("apply")}
        </Button>
      </form>

      <Link href={opportunitiesHref(query, { includeIneligible: query.includeIneligible ? null : "true" })} className="text-sm leading-5 text-asphalt underline underline-offset-4">
        {query.includeIneligible ? t("hideIneligible") : t("showIneligible")}
      </Link>
    </section>
  );
}

function BandChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-[6px] border px-3 font-mono text-label transition-colors",
        active ? "border-asphalt bg-asphalt text-paper" : "border-line bg-surface text-asphalt hover:border-asphalt",
      )}
    >
      {label}
    </Link>
  );
}
