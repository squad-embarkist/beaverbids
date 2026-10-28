import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { opportunitiesQuerySchema } from "@/lib/schemas/opportunities";
import {
  buildWhere,
  decodeCursor,
  encodeCursor,
  listOpportunities,
  PLACEHOLDER_SCORE,
  toOpportunityItem,
} from "./opportunities";

const now = new Date("2026-10-23T12:00:00.000Z");

function row(overrides: Partial<Parameters<typeof toOpportunityItem>[0]> = {}) {
  return {
    id: "01a1-tender",
    externalId: "FIXTURE-0001",
    title: "IT Managed Services and Cloud Infrastructure Support",
    buyer: "City of Sample",
    buyerType: "municipal",
    description: "Five-year managed services contract.",
    categoryCodes: ["it-managed-services-cloud"],
    region: "ON",
    valueMin: 1_000_000,
    valueMax: 1_400_000,
    publishedAt: new Date("2026-10-07T00:00:00.000Z"),
    closesAt: new Date("2026-11-01T00:00:00.000Z"),
    language: "EN" as const,
    officialUrl: "https://example.com/fixtures/FIXTURE-0001",
    source: { code: "fixtures", name: "Fixture tenders (fictional)", baseUrl: "https://example.com/fixtures" },
    scores: [],
    ...overrides,
  };
}

describe("cursor", () => {
  it.each([
    { phase: "closing" as const, closesAt: "2026-11-01T00:00:00.000Z", id: "01a1-tender" },
    { phase: "scored" as const, total: 92, closesAt: "2026-11-01T00:00:00.000Z", id: "01a1-tender" },
    { phase: "unscored" as const, closesAt: "2026-11-01T00:00:00.000Z", id: "01a1-tender" },
    { phase: "unscored" as const, closesAt: null, id: null },
  ])("round-trips a $phase cursor through base64url", (cursor) => {
    const encoded = encodeCursor(cursor);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it("returns null for garbage, a malformed payload or the pre-M3 shape", () => {
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(decodeCursor(Buffer.from('{"id":"x"}').toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from('{"phase":"closing","closesAt":"yesterday","id":"x"}').toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from('{"closesAt":"2026-11-01T00:00:00.000Z","id":"x"}').toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from('{"phase":"scored","closesAt":"2026-11-01T00:00:00.000Z","id":"x"}').toString("base64url"))).toBeNull();
  });
});

describe("buildWhere", () => {
  it("always excludes closed tenders", () => {
    const where = buildWhere(opportunitiesQuerySchema.parse({}), null, now);
    expect(where.AND).toEqual([{ closesAt: { gt: now } }]);
  });

  it("lets a national tender match a province filter", () => {
    const where = buildWhere(opportunitiesQuerySchema.parse({ region: "BC" }), null, now);
    expect(where.AND).toContainEqual({ region: { in: ["BC", "CA"] } });
  });

  it("filters category, value overlap, closing date and text", () => {
    const query = opportunitiesQuerySchema.parse({
      category: "cybersecurity-data-protection",
      valueMin: "100000",
      valueMax: "500000",
      closesBefore: "2026-12-01T00:00:00.000Z",
      q: "sample",
    });
    const where = buildWhere(query, null, now);
    expect(where.AND).toContainEqual({ categoryCodes: { has: "cybersecurity-data-protection" } });
    expect(where.AND).toContainEqual({ valueMax: { gte: 100_000 } });
    expect(where.AND).toContainEqual({ valueMin: { lte: 500_000 } });
    expect(where.AND).toContainEqual({ closesAt: { lte: new Date("2026-12-01T00:00:00.000Z") } });
    expect(where.AND).toContainEqual({
      OR: [
        { title: { contains: "sample", mode: "insensitive" } },
        { buyer: { contains: "sample", mode: "insensitive" } },
      ],
    });
  });

  it("hides ineligible scores for a profile unless asked", () => {
    const hidden = buildWhere(opportunitiesQuerySchema.parse({}), "profile-1", now);
    expect(hidden.AND).toContainEqual({ NOT: { scores: { some: { profileId: "profile-1", eligible: false } } } });

    const shown = buildWhere(opportunitiesQuerySchema.parse({ includeIneligible: "true" }), "profile-1", now);
    expect(shown.AND).not.toContainEqual({ NOT: { scores: { some: { profileId: "profile-1", eligible: false } } } });
  });

  it("returns nothing for a band filter when the user has no profile", () => {
    const where = buildWhere(opportunitiesQuerySchema.parse({ band: "HIGH" }), null, now);
    expect(where.AND).toContainEqual({ id: { in: [] } });
  });

  it("turns closingWithin into a closing-date ceiling", () => {
    const where = buildWhere(opportunitiesQuerySchema.parse({ closingWithin: "7" }), null, now);
    expect(where.AND).toContainEqual({ closesAt: { lte: new Date("2026-10-30T12:00:00.000Z") } });
  });

  it("adds the keyset condition from a closing cursor and ignores a broken or foreign one", () => {
    const cursor = encodeCursor({ phase: "closing", closesAt: "2026-11-01T00:00:00.000Z", id: "abc" });
    const where = buildWhere(opportunitiesQuerySchema.parse({ cursor }), null, now);
    expect(where.AND).toContainEqual({
      OR: [
        { closesAt: { gt: new Date("2026-11-01T00:00:00.000Z") } },
        { closesAt: new Date("2026-11-01T00:00:00.000Z"), id: { gt: "abc" } },
      ],
    });

    const broken = buildWhere(opportunitiesQuerySchema.parse({ cursor: "zzz" }), null, now);
    expect(broken.AND).toHaveLength(1);

    const scored = encodeCursor({ phase: "scored", total: 50, closesAt: "2026-11-01T00:00:00.000Z", id: "abc" });
    expect(buildWhere(opportunitiesQuerySchema.parse({ cursor: scored }), null, now).AND).toHaveLength(1);
  });
});

describe("toOpportunityItem", () => {
  it("uses the placeholder score when no row exists", () => {
    const item = toOpportunityItem(row());
    expect(item.score).toEqual(PLACEHOLDER_SCORE);
    expect(item.closesAt).toBe("2026-11-01T00:00:00.000Z");
    expect(item.source.code).toBe("fixtures");
  });

  it("serializes a real score row and nulls JSON it cannot read", () => {
    const item = toOpportunityItem(
      row({
        scores: [
          {
            total: 92,
            band: "HIGH",
            eligible: true,
            factors: { category: 38 },
            reasons: { inFavour: ["x"], gaps: [], ruleOut: [] },
            modelVersion: "rules-1",
            scoredAt: new Date("2026-10-23T06:00:00.000Z"),
          },
        ],
      }),
    );
    expect(item.score).toMatchObject({ placeholder: false, total: 92, band: "HIGH", modelVersion: "rules-1", factors: null, reasons: null });

    const good = toOpportunityItem(
      row({
        scores: [
          {
            total: 92,
            band: "HIGH",
            eligible: true,
            factors: { category: 38, location: 19, size: 14, timeline: 12, credentials: 9 },
            reasons: { inFavour: [{ code: "categoryMatch", params: { category: "it-managed-services-cloud" }, text: "x" }], gaps: [], ruleOut: [], summary: [] },
            modelVersion: "rules-3",
            scoredAt: new Date("2026-10-23T06:00:00.000Z"),
          },
        ],
      }),
    );
    expect(good.score).toMatchObject({ factors: { category: 38 }, reasons: { inFavour: [{ code: "categoryMatch" }] } });
  });
});

describe("listOpportunities by closing date", () => {
  it("fetches limit + 1 rows and returns a cursor only when more exist (sort=score without a profile)", async () => {
    const rows = [row({ id: "a" }), row({ id: "b" }), row({ id: "c" })];
    const findMany = vi.fn().mockResolvedValue(rows);
    const db = { tender: { findMany }, score: { findMany: vi.fn() } } as unknown as PrismaClient;

    const page = await listOpportunities(db, {
      query: opportunitiesQuerySchema.parse({ limit: "2" }),
      profileId: null,
      now,
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
    expect(page.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(page.nextCursor!)).toEqual({ phase: "closing", closesAt: "2026-11-01T00:00:00.000Z", id: "b" });
  });

  it("returns a null cursor on the last page", async () => {
    const findMany = vi.fn().mockResolvedValue([row({ id: "a" })]);
    const db = { tender: { findMany }, score: { findMany: vi.fn() } } as unknown as PrismaClient;

    const page = await listOpportunities(db, {
      query: opportunitiesQuerySchema.parse({ limit: "2", sort: "closing" }),
      profileId: "profile-1",
      now,
    });

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ scores: expect.objectContaining({ where: { profileId: "profile-1" } }) }),
      }),
    );
  });
});

describe("listOpportunities by score", () => {
  const scoreRow = (id: string, total: number, closesAt = "2026-11-01T00:00:00.000Z") => ({
    total,
    band: "HIGH" as const,
    eligible: true,
    factors: null,
    reasons: null,
    modelVersion: "rules-3",
    scoredAt: new Date("2026-10-23T06:00:00.000Z"),
    tender: { ...row({ id, closesAt: new Date(closesAt) }), scores: undefined },
  });

  function fakeDb(scoreRows: ReturnType<typeof scoreRow>[], tenderRows: ReturnType<typeof row>[]) {
    const score = { findMany: vi.fn().mockResolvedValue(scoreRows) };
    const tender = { findMany: vi.fn().mockResolvedValue(tenderRows) };
    return { db: { score, tender } as unknown as PrismaClient, score, tender };
  }

  it("orders score rows by total, closing date and id, scoped to the profile and eligible rows", async () => {
    const { db, score, tender } = fakeDb([scoreRow("a", 92), scoreRow("b", 88), scoreRow("c", 70)], []);

    const page = await listOpportunities(db, { query: opportunitiesQuerySchema.parse({ limit: "2" }), profileId: "profile-1", now });

    expect(score.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ profileId: "profile-1", eligible: true, tender: { AND: [{ closesAt: { gt: now } }] } }] },
        orderBy: [{ total: "desc" }, { tender: { closesAt: "asc" } }, { tenderId: "asc" }],
        take: 3,
      }),
    );
    expect(tender.findMany).not.toHaveBeenCalled();
    expect(page.items.map((i) => [i.id, i.score.total])).toEqual([
      ["a", 92],
      ["b", 88],
    ]);
    expect(decodeCursor(page.nextCursor!)).toEqual({ phase: "scored", total: 88, closesAt: "2026-11-01T00:00:00.000Z", id: "b" });
  });

  it("applies the scored keyset and the band and ineligible switches", async () => {
    const { db, score, tender } = fakeDb([], []);
    const cursor = encodeCursor({ phase: "scored", total: 88, closesAt: "2026-11-01T00:00:00.000Z", id: "b" });

    const page = await listOpportunities(db, {
      query: opportunitiesQuerySchema.parse({ cursor, band: "MEDIUM", includeIneligible: "true", region: "ON" }),
      profileId: "profile-1",
      now,
    });

    const call = score.findMany.mock.calls[0][0];
    expect(call.where.AND[0]).toEqual({ profileId: "profile-1", band: "MEDIUM", tender: { AND: [{ closesAt: { gt: now } }, { region: { in: ["ON", "CA"] } }] } });
    expect(call.where.AND[1]).toEqual({
      OR: [
        { total: { lt: 88 } },
        { total: 88, tender: { closesAt: { gt: new Date("2026-11-01T00:00:00.000Z") } } },
        { total: 88, tender: { closesAt: new Date("2026-11-01T00:00:00.000Z") }, tenderId: { gt: "b" } },
      ],
    });
    // A band filter never falls through to unscored tenders.
    expect(tender.findMany).not.toHaveBeenCalled();
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it("fills a short page from tenders without a score row, placeholders after scored rows", async () => {
    const { db, tender } = fakeDb([scoreRow("a", 92)], [row({ id: "u1" }), row({ id: "u2" }), row({ id: "u3" }), row({ id: "u4" })]);

    const page = await listOpportunities(db, { query: opportunitiesQuerySchema.parse({ limit: "4" }), profileId: "profile-1", now });

    expect(tender.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ closesAt: { gt: now } }, { scores: { none: { profileId: "profile-1" } } }] },
        orderBy: [{ closesAt: "asc" }, { id: "asc" }],
        take: 4,
      }),
    );
    expect(page.items.map((i) => [i.id, i.score.placeholder])).toEqual([
      ["a", false],
      ["u1", true],
      ["u2", true],
      ["u3", true],
    ]);
    expect(decodeCursor(page.nextCursor!)).toEqual({ phase: "unscored", closesAt: "2026-11-01T00:00:00.000Z", id: "u3" });
  });

  it("hands out a start-of-phase cursor when scored rows fill the page exactly and unscored rows remain", async () => {
    const { db } = fakeDb([scoreRow("a", 92), scoreRow("b", 88)], [row({ id: "u1" })]);
    const page = await listOpportunities(db, { query: opportunitiesQuerySchema.parse({ limit: "2" }), profileId: "profile-1", now });
    expect(page.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(decodeCursor(page.nextCursor!)).toEqual({ phase: "unscored", closesAt: null, id: null });
  });

  it("skips phase 1 on an unscored cursor and continues the closing keyset", async () => {
    const { db, score, tender } = fakeDb([], [row({ id: "u5" })]);
    const cursor = encodeCursor({ phase: "unscored", closesAt: "2026-11-01T00:00:00.000Z", id: "u3" });

    const page = await listOpportunities(db, { query: opportunitiesQuerySchema.parse({ cursor, limit: "2" }), profileId: "profile-1", now });

    expect(score.findMany).not.toHaveBeenCalled();
    expect(tender.findMany.mock.calls[0][0].where.AND).toContainEqual({
      OR: [{ closesAt: { gt: new Date("2026-11-01T00:00:00.000Z") } }, { closesAt: new Date("2026-11-01T00:00:00.000Z"), id: { gt: "u3" } }],
    });
    expect(page).toMatchObject({ items: [{ id: "u5" }], nextCursor: null });
  });
});
