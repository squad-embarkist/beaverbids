import { OPPORTUNITIES_DEFAULT_LIMIT, opportunitiesQuerySchema, queryObjectFrom, type OpportunitiesQuery } from "@/lib/schemas/opportunities";

// The list keeps its state in the URL. These helpers rebuild /opportunities
// links from the parsed query so a chip or a "show more" link changes one
// parameter and keeps the rest. The cursor is dropped whenever a filter
// changes, since a cursor only makes sense for the query it came from.

export type QueryPatch = Partial<Record<"q" | "category" | "region" | "closingWithin" | "sort" | "band" | "includeIneligible" | "cursor", string | null>>;

// Bad or stale parameters fall back to the defaults rather than a 400: the
// page is reached by links, not by hand-built queries.
export function parseQuery(params: Record<string, string | string[] | undefined> | URLSearchParams): OpportunitiesQuery {
  const search = params instanceof URLSearchParams ? params : new URLSearchParams();
  if (!(params instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(params)) {
      const first = Array.isArray(value) ? value[0] : value;
      if (first != null) search.set(key, first);
    }
  }
  const parsed = opportunitiesQuerySchema.safeParse(queryObjectFrom(search));
  return parsed.success ? parsed.data : opportunitiesQuerySchema.parse({});
}

export function queryParams(query: OpportunitiesQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.region) params.set("region", query.region);
  if (query.closingWithin != null) params.set("closingWithin", String(query.closingWithin));
  if (query.sort !== "score") params.set("sort", query.sort);
  if (query.band) params.set("band", query.band);
  if (query.includeIneligible) params.set("includeIneligible", "true");
  if (query.limit !== OPPORTUNITIES_DEFAULT_LIMIT) params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);
  return params;
}

export function opportunitiesHref(query: OpportunitiesQuery, patch: QueryPatch = {}): string {
  const params = queryParams(query);
  if (!("cursor" in patch)) params.delete("cursor");
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/opportunities?${qs}` : "/opportunities";
}

export function hasFilters(query: OpportunitiesQuery): boolean {
  return Boolean(query.q || query.category || query.region || query.closingWithin != null || query.band);
}

// Everything a reset clears: the filters, the band chip, the sort and the
// ineligible toggle.
export function activeFilterCount(query: OpportunitiesQuery): number {
  return [query.q, query.category, query.region, query.closingWithin != null, query.band, query.includeIneligible, query.sort !== "score"].filter(Boolean).length;
}
