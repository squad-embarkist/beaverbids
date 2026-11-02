// Integration test against a real PostgreSQL database (DATABASE_URL).
// Seeds the fixture tenders and a profile, runs scoreAll twice, and checks
// the score table. Skipped when DATABASE_URL is unset.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { listOpportunities } from "@/lib/opportunities";
import { opportunitiesQuerySchema } from "@/lib/schemas/opportunities";
import { SAMPLE_TENDER_EXTERNAL_ID, seedFixtures } from "@/lib/seed/fixtures";
import { SAMPLE_PROFILE } from "@/lib/seed/sample-profile";
import { openTenderFilters } from "@/lib/tenders";
import { MODEL_VERSION } from "./score";
import { scoreAll } from "./run";

const databaseUrl = process.env.DATABASE_URL;
const TEST_EMAIL = "scoring-int-test@beaverbids.test";

describe.skipIf(!databaseUrl)("scoreAll against PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const now = new Date();
  let profileId = "";

  beforeAll(async () => {
    // Upsert the fixtures in place. Deleting the fixtures source row would
    // cascade to every fixture tender and every score on them, including the
    // dev account's, on each local `npm test`.
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await seedFixtures(prisma, { now });
    // A bare user row (no Better Auth) carrying the sample profile.
    const user = await prisma.user.create({ data: { id: crypto.randomUUID(), name: "Scoring test", email: TEST_EMAIL, emailVerified: false } });
    const profile = await prisma.companyProfile.create({ data: { ...SAMPLE_PROFILE, userId: user.id, questionnaireStep: 5 } });
    profileId = profile.id;
  });

  afterAll(async () => {
    // The test user cascades to its profile and that profile's scores only.
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it("writes one score per open tender for the profile, and reruns without duplicates", async () => {
    // The same open-tender rules scoreAll uses, so real CanadaBuys rows in the
    // local database (closed, withdrawn or non-bid ones excluded) count too.
    const openTenders = await prisma.tender.count({ where: { AND: openTenderFilters(now) } });
    expect(openTenders).toBeGreaterThan(0);

    const first = await scoreAll(prisma, { profileId, now });
    expect(first).toMatchObject({ profiles: 1, tenders: openTenders, scored: openTenders, modelVersion: MODEL_VERSION });

    const second = await scoreAll(prisma, { profileId, now });
    expect(second.scored).toBe(openTenders);

    expect(await prisma.score.count({ where: { profileId } })).toBe(openTenders);
  });

  it("stores the sample tender at 92 with the five factors and the reasons", async () => {
    const sample = await prisma.tender.findFirstOrThrow({ where: { externalId: SAMPLE_TENDER_EXTERNAL_ID } });
    const score = await prisma.score.findUniqueOrThrow({ where: { tenderId_profileId: { tenderId: sample.id, profileId } } });

    expect(score.total).toBe(92);
    expect(score.band).toBe("HIGH");
    expect(score.eligible).toBe(true);
    expect(score.factors).toEqual({ category: 38, location: 19, size: 14, timeline: 12, credentials: 9 });
    expect(score.reasons).toMatchObject({
      inFavour: expect.arrayContaining([expect.objectContaining({ code: "categoryMatch" })]),
      summary: expect.any(Array),
    });
    expect(score.modelVersion).toBe(MODEL_VERSION);
  });

  it("stores the recreation centre tender capped at 49, Low, with the factors uncapped and the cap reason", async () => {
    const recCentre = await prisma.tender.findFirstOrThrow({ where: { externalId: "FIXTURE-0026" } });
    const score = await prisma.score.findUniqueOrThrow({ where: { tenderId_profileId: { tenderId: recCentre.id, profileId } } });
    expect(score.total).toBe(49);
    expect(score.band).toBe("LOW");
    expect(score.eligible).toBe(true);
    expect(score.factors).toMatchObject({ category: 8 });
    const reasons = score.reasons as { gaps: { code: string }[] };
    expect(reasons.gaps[0]?.code).toBe("categoryCap");

    const versions = await prisma.score.findMany({ where: { profileId }, select: { modelVersion: true }, distinct: ["modelVersion"] });
    expect(versions).toEqual([{ modelVersion: "rules-4" }]);
  });

  it("shows up in GET /api/opportunities as a real score", async () => {
    const page = await listOpportunities(prisma, {
      query: opportunitiesQuerySchema.parse({ q: "city of sample", limit: "5" }),
      profileId,
      now,
    });
    const item = page.items.find((i) => i.externalId === SAMPLE_TENDER_EXTERNAL_ID);
    expect(item?.score).toMatchObject({ placeholder: false, total: 92, band: "HIGH", eligible: true });
  });

  it("hides ineligible tenders from the default list and shows them with includeIneligible", async () => {
    // Pages through the whole list: with real CanadaBuys rows present the
    // gated notices sit far below the first page.
    async function allItems(extra: Record<string, string> = {}) {
      const items = [];
      let cursor: string | undefined;
      do {
        const page = await listOpportunities(prisma, { query: opportunitiesQuerySchema.parse({ limit: "100", ...extra, ...(cursor ? { cursor } : {}) }), profileId, now });
        items.push(...page.items);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return items;
    }
    const ineligible = await prisma.score.count({ where: { profileId, eligible: false, tender: { AND: openTenderFilters(now) } } });
    expect(ineligible).toBeGreaterThan(0);

    const hidden = await allItems();
    expect(hidden.every((i) => i.score.eligible)).toBe(true);

    const all = await allItems({ includeIneligible: "true" });
    expect(all.length).toBe(hidden.length + ineligible);
    expect(all.filter((i) => !i.score.eligible)).toHaveLength(ineligible);
  });
});
