import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { OpportunitiesQuery } from "@/lib/schemas/opportunities";
import type { ScoreBand } from "@/lib/schemas/vocab";

// Query builder and serializer for GET /api/opportunities. Pure enough to
// unit test with a mocked client; the route handler only parses, checks the
// session and calls listOpportunities.

// ---- cursor ---------------------------------------------------------------
// Keyset on (closesAt asc, id asc), so a page stays stable while rows are
// inserted. Encoded as base64url JSON.

const cursorSchema = z.object({
  closesAt: z.iso.datetime(),
  id: z.string().min(1),
});

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
      factors: unknown;
      reasons: unknown;
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
  officialUrl: string;
  source: { code: string; name: string };
  score: ScoreSummary;
};

export type OpportunitiesPage = {
  items: OpportunityItem[];
  nextCursor: string | null;
};

// Until M2 writes real score rows, every tender carries this.
export const PLACEHOLDER_SCORE: ScoreSummary = {
  placeholder: true,
  total: null,
  band: null,
  eligible: true,
};

const tenderSelect = {
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
  source: { select: { code: true, name: true } },
} satisfies Prisma.TenderSelect;

type TenderRow = Prisma.TenderGetPayload<{ select: typeof tenderSelect }> & {
  scores: Array<{
    total: number;
    band: ScoreBand;
    eligible: boolean;
    factors: unknown;
    reasons: unknown;
    modelVersion: string;
    scoredAt: Date;
  }>;
};

export function toOpportunityItem(row: TenderRow): OpportunityItem {
  const score = row.scores[0];
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
    score: score
      ? {
          placeholder: false,
          total: score.total,
          band: score.band,
          eligible: score.eligible,
          factors: score.factors,
          reasons: score.reasons,
          modelVersion: score.modelVersion,
          scoredAt: score.scoredAt.toISOString(),
        }
      : PLACEHOLDER_SCORE,
  };
}

// ---- where clause ---------------------------------------------------------

export function buildWhere(
  query: OpportunitiesQuery,
  profileId: string | null,
  now: Date,
): Prisma.TenderWhereInput {
  const and: Prisma.TenderWhereInput[] = [{ closesAt: { gt: now } }];

  if (query.closesBefore) and.push({ closesAt: { lte: query.closesBefore } });
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
  if (query.band) {
    // Placeholder scores have no band, so a band filter needs real rows.
    and.push(
      profileId ? { scores: { some: { profileId, band: query.band } } } : { id: { in: [] } },
    );
  }
  if (profileId && !query.includeIneligible) {
    and.push({ NOT: { scores: { some: { profileId, eligible: false } } } });
  }
  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    if (cursor) {
      const closesAt = new Date(cursor.closesAt);
      and.push({
        OR: [{ closesAt: { gt: closesAt } }, { closesAt, id: { gt: cursor.id } }],
      });
    }
  }

  return { AND: and };
}

// ---- list -----------------------------------------------------------------

export type ListOpportunitiesInput = {
  query: OpportunitiesQuery;
  profileId: string | null;
  now?: Date;
};

// sort=score falls back to closing soonest until M2 writes real scores; the
// score ordering with its own keyset lands with the scoring engine.
export async function listOpportunities(
  db: PrismaClient,
  { query, profileId, now = new Date() }: ListOpportunitiesInput,
): Promise<OpportunitiesPage> {
  const rows = await db.tender.findMany({
    where: buildWhere(query, profileId, now),
    orderBy: [{ closesAt: "asc" }, { id: "asc" }],
    take: query.limit + 1,
    select: {
      ...tenderSelect,
      scores: {
        where: { profileId: profileId ?? "" },
        select: {
          total: true,
          band: true,
          eligible: true,
          factors: true,
          reasons: true,
          modelVersion: true,
          scoredAt: true,
        },
        take: 1,
      },
    },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map(toOpportunityItem),
    nextCursor:
      hasMore && last ? encodeCursor({ closesAt: last.closesAt.toISOString(), id: last.id }) : null,
  };
}
