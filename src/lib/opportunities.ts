import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { OpportunitiesQuery } from "@/lib/schemas/opportunities";
import type { ScoreBand } from "@/lib/schemas/vocab";
import type { ReasonSet } from "@/lib/scoring/reasons";
import { parseFactors, parseReasons } from "@/lib/scoring/stored";
import type { FactorPoints } from "@/lib/scoring/types";

// Query builder and serializer for GET /api/opportunities and the list
// page. Pure enough to unit test with a mocked client; the route handler
// only parses, checks the session and calls listOpportunities.

// ---- cursor ---------------------------------------------------------------
// Keyset cursors, encoded as base64url JSON. Three shapes:
//   closing   sort=closing (and sort=score without a profile): closesAt, id
//   scored    sort=score phase 1: total desc, closesAt asc, id asc
//   unscored  sort=score phase 2: tenders with no score row for the profile,
//             by closesAt, id; null fields mean "start of the phase"

const DATE = z.iso.datetime();
const ID = z.string().min(1);

const cursorSchema = z.discriminatedUnion("phase", [
  z.object({ phase: z.literal("closing"), closesAt: DATE, id: ID }),
  z.object({ phase: z.literal("scored"), total: z.number().int(), closesAt: DATE, id: ID }),
  z.object({ phase: z.literal("unscored"), closesAt: DATE.nullable(), id: ID.nullable() }),
]);

export type Cursor = z.infer<typeof cursorSchema>;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string): Cursor | null {
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ---- response shape -------------------------------------------------------

export type ScoreSummary =
  | {
      placeholder: true;
      total: null;
      band: null;
      eligible: true;
    }
  | {
      placeholder: false;
      total: number;
      band: ScoreBand;
      eligible: boolean;
      factors: FactorPoints | null;
      reasons: ReasonSet | null;
      modelVersion: string;
      scoredAt: string;
    };

export type OpportunityItem = {
  id: string;
  externalId: string;
  title: string;
  buyer: string;
  buyerType: string | null;
  description: string;
  categoryCodes: string[];
  region: string;
  valueMin: number | null;
  valueMax: number | null;
  publishedAt: string;
  closesAt: string;
  language: string;
  officialUrl: string | null;
  source: { code: string; name: string; baseUrl: string };
  score: ScoreSummary;
};

export type OpportunitiesPage = {
  items: OpportunityItem[];
  nextCursor: string | null;
};

// A tender with no score row yet for this profile.
export const PLACEHOLDER_SCORE: ScoreSummary = {
  placeholder: true,
  total: null,
  band: null,
  eligible: true,
};

export const tenderSelect = {
  id: true,
  externalId: true,
  title: true,
  buyer: true,
  buyerType: true,
  description: true,
  categoryCodes: true,
  region: true,
  valueMin: true,
  valueMax: true,
  publishedAt: true,
  closesAt: true,
  language: true,
  officialUrl: true,
  source: { select: { code: true, name: true, baseUrl: true } },
} satisfies Prisma.TenderSelect;

export const scoreSelect = {
  total: true,
  band: true,
  eligible: true,
  factors: true,
  reasons: true,
  modelVersion: true,
  scoredAt: true,
} satisfies Prisma.ScoreSelect;

type ScoreRow = Prisma.ScoreGetPayload<{ select: typeof scoreSelect }>;
type TenderRow = Prisma.TenderGetPayload<{ select: typeof tenderSelect }> & { scores: ScoreRow[] };

export function toScoreSummary(score: ScoreRow | undefined): ScoreSummary {
  if (!score) return PLACEHOLDER_SCORE;
  return {
    placeholder: false,
    total: score.total,
    band: score.band,
    eligible: score.eligible,
    factors: parseFactors(score.factors),
    reasons: parseReasons(score.reasons),
    modelVersion: score.modelVersion,
    scoredAt: score.scoredAt.toISOString(),
  };
}

export function toOpportunityItem(row: TenderRow): OpportunityItem {
  return {
    id: row.id,
    externalId: row.externalId,
    title: row.title,
    buyer: row.buyer,
    buyerType: row.buyerType,
    description: row.description,
    categoryCodes: row.categoryCodes,
    region: row.region,
    valueMin: row.valueMin,
    valueMax: row.valueMax,
    publishedAt: row.publishedAt.toISOString(),
    closesAt: row.closesAt.toISOString(),
    language: row.language,
    officialUrl: row.officialUrl,
    source: row.source,
    score: toScoreSummary(row.scores[0]),
  };
}

// ---- where clauses --------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

// The filters that apply to the tender itself, whatever the sort.
export function tenderFilters(query: OpportunitiesQuery, now: Date): Prisma.TenderWhereInput[] {
  const and: Prisma.TenderWhereInput[] = [{ closesAt: { gt: now } }];

  if (query.closesBefore) and.push({ closesAt: { lte: query.closesBefore } });
  if (query.closingWithin != null) and.push({ closesAt: { lte: new Date(now.getTime() + query.closingWithin * DAY_MS) } });
  // A tender open to all of Canada matches every province filter.
  if (query.region) {
    and.push(query.region === "CA" ? { region: "CA" } : { region: { in: [query.region, "CA"] } });
  }
  if (query.category) and.push({ categoryCodes: { has: query.category } });
  // Value overlap: a tender with no published value never matches a value filter.
  if (query.valueMin != null) and.push({ valueMax: { gte: query.valueMin } });
  if (query.valueMax != null) and.push({ valueMin: { lte: query.valueMax } });
  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { buyer: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  return and;
}

// The closing-date list: tender filters, the band and eligibility rules
// through the score relation, and the closing keyset.
export function buildWhere(query: OpportunitiesQuery, profileId: string | null, now: Date): Prisma.TenderWhereInput {
  const and = tenderFilters(query, now);

  if (query.band) {
    // Placeholder scores have no band, so a band filter needs real rows.
    and.push(profileId ? { scores: { some: { profileId, band: query.band } } } : { id: { in: [] } });
  }
  if (profileId && !query.includeIneligible) {
    and.push({ NOT: { scores: { some: { profileId, eligible: false } } } });
  }
  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    if (cursor?.phase === "closing") and.push(closingKeyset(cursor.closesAt, cursor.id));
  }

  return { AND: and };
}

function closingKeyset(closesAtIso: string, id: string): Prisma.TenderWhereInput {
  const closesAt = new Date(closesAtIso);
  return { OR: [{ closesAt: { gt: closesAt } }, { closesAt, id: { gt: id } }] };
}

// ---- list -----------------------------------------------------------------

export type ListOpportunitiesInput = {
  query: OpportunitiesQuery;
  profileId: string | null;
  now?: Date;
};

type Db = Pick<PrismaClient, "tender" | "score">;

export async function listOpportunities(db: Db, { query, profileId, now = new Date() }: ListOpportunitiesInput): Promise<OpportunitiesPage> {
  if (query.sort === "score" && profileId) {
    return listByScore(db, query, profileId, now);
  }
  return listByClosing(db, query, profileId, now);
}

async function listByClosing(db: Db, query: OpportunitiesQuery, profileId: string | null, now: Date): Promise<OpportunitiesPage> {
  const rows = await db.tender.findMany({
    where: buildWhere(query, profileId, now),
    orderBy: [{ closesAt: "asc" }, { id: "asc" }],
    take: query.limit + 1,
    select: {
      ...tenderSelect,
      scores: { where: { profileId: profileId ?? "" }, select: scoreSelect, take: 1 },
    },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map(toOpportunityItem),
    nextCursor: hasMore && last ? encodeCursor({ phase: "closing", closesAt: last.closesAt.toISOString(), id: last.id }) : null,
  };
}

// Best score first. Prisma cannot order tenders by one profile's score row,
// so the list runs in two phases: the profile's score rows (total desc,
// closing soonest, id), then the tenders that have no score row yet for
// this profile, by closing date. Every open tender appears exactly once and
// scored rows always come before unscored ones. A band filter skips phase
// 2, because an unscored tender has no band.
async function listByScore(db: Db, query: OpportunitiesQuery, profileId: string, now: Date): Promise<OpportunitiesPage> {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const items: OpportunityItem[] = [];

  if (cursor?.phase !== "unscored") {
    const scoredCursor = cursor?.phase === "scored" ? cursor : null;
    const and: Prisma.ScoreWhereInput[] = [
      {
        profileId,
        ...(query.includeIneligible ? {} : { eligible: true }),
        ...(query.band ? { band: query.band } : {}),
        tender: { AND: tenderFilters(query, now) },
      },
    ];
    if (scoredCursor) {
      const closesAt = new Date(scoredCursor.closesAt);
      and.push({
        OR: [
          { total: { lt: scoredCursor.total } },
          { total: scoredCursor.total, tender: { closesAt: { gt: closesAt } } },
          { total: scoredCursor.total, tender: { closesAt }, tenderId: { gt: scoredCursor.id } },
        ],
      });
    }

    const rows = await db.score.findMany({
      where: { AND: and },
      orderBy: [{ total: "desc" }, { tender: { closesAt: "asc" } }, { tenderId: "asc" }],
      take: query.limit + 1,
      select: { ...scoreSelect, tender: { select: tenderSelect } },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    for (const { tender, ...score } of page) {
      items.push(toOpportunityItem({ ...tender, scores: [score] }));
    }
    const last = page[page.length - 1];
    if (hasMore && last) {
      return {
        items,
        nextCursor: encodeCursor({ phase: "scored", total: last.total, closesAt: last.tender.closesAt.toISOString(), id: last.tender.id }),
      };
    }
    if (query.band) return { items, nextCursor: null };
  }

  // Phase 2: fill the page from tenders with no score row for this profile.
  const unscoredCursor = cursor?.phase === "unscored" ? cursor : null;
  const remaining = query.limit - items.length;
  const and: Prisma.TenderWhereInput[] = [...tenderFilters(query, now), { scores: { none: { profileId } } }];
  if (unscoredCursor?.closesAt && unscoredCursor.id) and.push(closingKeyset(unscoredCursor.closesAt, unscoredCursor.id));

  const rows = await db.tender.findMany({
    where: { AND: and },
    orderBy: [{ closesAt: "asc" }, { id: "asc" }],
    take: remaining + 1,
    select: tenderSelect,
  });

  const hasMore = rows.length > remaining;
  const page = hasMore ? rows.slice(0, remaining) : rows;
  for (const tender of page) items.push(toOpportunityItem({ ...tender, scores: [] }));

  if (!hasMore) return { items, nextCursor: null };
  const last = page[page.length - 1];
  return {
    items,
    // No room left on this page: the next one starts the unscored phase.
    nextCursor: encodeCursor(
      last
        ? { phase: "unscored", closesAt: last.closesAt.toISOString(), id: last.id }
        : { phase: "unscored", closesAt: unscoredCursor?.closesAt ?? null, id: unscoredCursor?.id ?? null },
    ),
  };
}
