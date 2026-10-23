// Integration test against a real PostgreSQL database (DATABASE_URL).
// Runs in CI against the Postgres service after `prisma migrate deploy`,
// and locally against `docker compose up -d`. Skipped when DATABASE_URL is unset.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { listOpportunities } from "@/lib/opportunities";
import { opportunitiesQuerySchema } from "@/lib/schemas/opportunities";
import { FIXTURE_SOURCE, SAMPLE_TENDER_EXTERNAL_ID, fixtureTenderInputs, seedFixtures } from "./fixtures";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("seedFixtures against PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const now = new Date();

  beforeAll(async () => {
    // Clean slate for the fixtures source only; other data is left alone.
    await prisma.source.deleteMany({ where: { code: FIXTURE_SOURCE.code } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("loads every fixture tender on a clean database and is safe to rerun", async () => {
    const expected = fixtureTenderInputs(now).length;

    const first = await seedFixtures(prisma, { now });
    expect(first.count).toBe(expected);

    const second = await seedFixtures(prisma, { now });
    expect(second.sourceId).toBe(first.sourceId);

    const stored = await prisma.tender.count({ where: { sourceId: first.sourceId } });
    expect(stored).toBe(expected);

    const source = await prisma.source.findUniqueOrThrow({ where: { code: FIXTURE_SOURCE.code } });
    expect(source.active).toBe(false);
  });

  it("includes the City of Sample IT managed services tender", async () => {
    const sample = await prisma.tender.findFirst({
      where: { externalId: SAMPLE_TENDER_EXTERNAL_ID },
      include: { source: true },
    });
    expect(sample?.title).toBe("IT Managed Services and Cloud Infrastructure Support");
    expect(sample?.buyer).toBe("City of Sample");
    expect(sample?.region).toBe("ON");
    expect(sample?.source.code).toBe(FIXTURE_SOURCE.code);
  });

  it("pages through every open fixture tender exactly once with the cursor", async () => {
    const expectedIds = new Set(
      (await prisma.tender.findMany({ where: { closesAt: { gt: now } }, select: { id: true } })).map((t) => t.id),
    );

    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await listOpportunities(prisma, {
        query: opportunitiesQuerySchema.parse({ limit: "20", ...(cursor ? { cursor } : {}) }),
        profileId: null,
        now,
      });
      pages += 1;
      seen.push(...page.items.map((i) => i.id));
      expect(page.items.length).toBeLessThanOrEqual(20);
      for (const item of page.items) expect(item.score.placeholder).toBe(true);
      cursor = page.nextCursor ?? undefined;
    } while (cursor && pages < 20);

    expect(new Set(seen).size).toBe(seen.length);
    expect(new Set(seen)).toEqual(expectedIds);
    expect(pages).toBe(Math.ceil(expectedIds.size / 20));
  });

  it("filters by region, category and text", async () => {
    const ontario = await listOpportunities(prisma, {
      query: opportunitiesQuerySchema.parse({ region: "ON", limit: "100" }),
      profileId: null,
      now,
    });
    expect(ontario.items.length).toBeGreaterThan(0);
    for (const item of ontario.items) expect(["ON", "CA"]).toContain(item.region);

    const search = await listOpportunities(prisma, {
      query: opportunitiesQuerySchema.parse({ q: "city of sample", category: "it-managed-services-cloud" }),
      profileId: null,
      now,
    });
    expect(search.items.map((i) => i.externalId)).toContain(SAMPLE_TENDER_EXTERNAL_ID);
  });
});
