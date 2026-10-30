// Integration test against a real PostgreSQL database (DATABASE_URL):
// pages the seeded fixtures by score for the sample profile. Skipped when
// DATABASE_URL is unset.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { opportunitiesQuerySchema } from "@/lib/schemas/opportunities";
import { scoreAll } from "@/lib/scoring/run";
import { SAMPLE_TENDER_EXTERNAL_ID, seedFixtures } from "@/lib/seed/fixtures";
import { SAMPLE_PROFILE } from "@/lib/seed/sample-profile";
import { getOpportunity, listOpportunities, type OpportunityItem } from "./opportunities";

const databaseUrl = process.env.DATABASE_URL;
const TEST_EMAIL = "opportunities-int-test@beaverbids.test";

describe.skipIf(!databaseUrl)("listOpportunities sort=score against PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const now = new Date();
  let profileId = "";

  async function allPages(extra: Record<string, string> = {}) {
    const items: OpportunityItem[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await listOpportunities(prisma, {
        query: opportunitiesQuerySchema.parse({ limit: "10", ...extra, ...(cursor ? { cursor } : {}) }),
        profileId,
        now,
      });
      items.push(...page.items);
      cursor = page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor && pages < 50);
    return { items, pages };
  }

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await seedFixtures(prisma, { now });
    const user = await prisma.user.create({ data: { id: crypto.randomUUID(), name: "Opportunities test", email: TEST_EMAIL, emailVerified: false } });
    const profile = await prisma.companyProfile.create({ data: { ...SAMPLE_PROFILE, userId: user.id, questionnaireStep: 5 } });
    profileId = profile.id;
    await scoreAll(prisma, { profileId, now });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it("pages every eligible tender once, best score first, with the sample tender at 92 on top", async () => {
    const { items, pages } = await allPages();
    const eligible = await prisma.score.count({ where: { profileId, eligible: true, tender: { closesAt: { gt: now } } } });

    expect(pages).toBeGreaterThan(1);
    expect(items).toHaveLength(eligible);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(items[0]).toMatchObject({ externalId: SAMPLE_TENDER_EXTERNAL_ID, score: { total: 92, band: "HIGH" } });
    const totals = items.map((i) => i.score.total ?? -1);
    for (let i = 1; i < totals.length; i += 1) expect(totals[i]).toBeLessThanOrEqual(totals[i - 1]);
    expect(items.every((i) => !i.score.placeholder)).toBe(true);
  });

  it("returns one listing with the stored factors, reasons and source link details", async () => {
    const sample = await prisma.tender.findFirstOrThrow({ where: { externalId: SAMPLE_TENDER_EXTERNAL_ID } });
    const item = await getOpportunity(prisma, { id: sample.id, profileId });
    expect(item).toMatchObject({
      externalId: SAMPLE_TENDER_EXTERNAL_ID,
      source: { code: "fixtures", baseUrl: "https://example.com/fixtures" },
      score: { total: 92, band: "HIGH", factors: { category: 38, location: 19, size: 14, timeline: 12, credentials: 9 } },
    });
    const score = item?.score;
    expect(score && !score.placeholder ? score.reasons?.inFavour[0]?.code : null).toBe("categoryMatch");

    const noLink = await prisma.tender.findFirstOrThrow({ where: { externalId: "FIXTURE-0054" } });
    expect((await getOpportunity(prisma, { id: noLink.id, profileId }))?.officialUrl).toBeNull();
    expect(await getOpportunity(prisma, { id: "00000000-0000-0000-0000-000000000000", profileId })).toBeNull();
  });

  it("appends tenders without a score row after the scored ones, each once", async () => {
    const scored = await prisma.score.findMany({ where: { profileId }, select: { id: true, tenderId: true }, take: 13, orderBy: { tenderId: "asc" } });
    await prisma.score.deleteMany({ where: { id: { in: scored.map((s) => s.id) } } });
    const open = await prisma.tender.count({ where: { closesAt: { gt: now } } });
    const ineligible = await prisma.score.count({ where: { profileId, eligible: false } });

    const { items } = await allPages();
    expect(items).toHaveLength(open - ineligible);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    const firstPlaceholder = items.findIndex((i) => i.score.placeholder);
    expect(firstPlaceholder).toBeGreaterThan(0);
    expect(items.slice(firstPlaceholder).every((i) => i.score.placeholder)).toBe(true);
    expect(items.slice(firstPlaceholder).map((i) => i.id).sort()).toEqual(scored.map((s) => s.tenderId).sort());

    const highOnly = await allPages({ band: "HIGH" });
    expect(highOnly.items.every((i) => i.score.band === "HIGH")).toBe(true);
  });
});
