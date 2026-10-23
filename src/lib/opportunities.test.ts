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
    source: { code: "fixtures", name: "Fixture tenders (fictional)" },
    scores: [],
    ...overrides,
  };
}

describe("cursor", () => {
  it("round-trips through base64url", () => {
    const cursor = { closesAt: "2026-11-01T00:00:00.000Z", id: "01a1-tender" };
    const encoded = encodeCursor(cursor);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it("returns null for garbage or a malformed payload", () => {
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(decodeCursor(Buffer.from('{"id":"x"}').toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from('{"closesAt":"yesterday","id":"x"}').toString("base64url"))).toBeNull();
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

  it("adds the keyset condition from a valid cursor and ignores a broken one", () => {
    const cursor = encodeCursor({ closesAt: "2026-11-01T00:00:00.000Z", id: "abc" });
    const where = buildWhere(opportunitiesQuerySchema.parse({ cursor }), null, now);
    expect(where.AND).toContainEqual({
      OR: [
        { closesAt: { gt: new Date("2026-11-01T00:00:00.000Z") } },
        { closesAt: new Date("2026-11-01T00:00:00.000Z"), id: { gt: "abc" } },
      ],
    });

    const broken = buildWhere(opportunitiesQuerySchema.parse({ cursor: "zzz" }), null, now);
    expect(broken.AND).toHaveLength(1);
  });
});

describe("toOpportunityItem", () => {
  it("uses the placeholder score when no row exists", () => {
    const item = toOpportunityItem(row());
    expect(item.score).toEqual(PLACEHOLDER_SCORE);
    expect(item.closesAt).toBe("2026-11-01T00:00:00.000Z");
    expect(item.source.code).toBe("fixtures");
  });

  it("serializes a real score row", () => {
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
    expect(item.score).toMatchObject({ placeholder: false, total: 92, band: "HIGH", modelVersion: "rules-1" });
  });
});

describe("listOpportunities", () => {
  it("fetches limit + 1 rows and returns a cursor only when more exist", async () => {
    const rows = [row({ id: "a" }), row({ id: "b" }), row({ id: "c" })];
    const findMany = vi.fn().mockResolvedValue(rows);
    const db = { tender: { findMany } } as unknown as PrismaClient;

    const page = await listOpportunities(db, {
      query: opportunitiesQuerySchema.parse({ limit: "2" }),
      profileId: null,
      now,
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
    expect(page.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(page.nextCursor!)).toEqual({ closesAt: "2026-11-01T00:00:00.000Z", id: "b" });
  });

  it("returns a null cursor on the last page", async () => {
    const findMany = vi.fn().mockResolvedValue([row({ id: "a" })]);
    const db = { tender: { findMany } } as unknown as PrismaClient;

    const page = await listOpportunities(db, {
      query: opportunitiesQuerySchema.parse({ limit: "2" }),
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
