import type { PrismaClient } from "@/generated/prisma/client";
import { tenderInputSchema, type TenderInput } from "@/lib/schemas/tender";
import fixtureFile from "../../../fixtures/tenders.json";

// Loads the fictional tenders in fixtures/tenders.json. They attach to their
// own "fixtures" source, which is never active, so they can never be mistaken
// for real CanadaBuys notices. Safe to rerun: everything is upserted.

export const FIXTURE_SOURCE = {
  code: "fixtures",
  name: "Fixture tenders (fictional)",
  baseUrl: "https://example.com/fixtures",
  active: false,
} as const;

export const SAMPLE_TENDER_EXTERNAL_ID = "FIXTURE-0001";

type FixtureTender = Omit<TenderInput, "publishedAt" | "closesAt" | "rawFileKey"> & {
  postedDaysAgo: number;
  closesInDays: number;
};

export type FixtureFile = {
  _fixture: string;
  tenders: FixtureTender[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

// Resolves the day offsets against `now`, so the seed is always current and
// the golden set can pin a fixed `now` for determinism.
export function fixtureTenderInputs(now: Date, file: FixtureFile = fixtureFile as FixtureFile): TenderInput[] {
  return file.tenders.map(({ postedDaysAgo, closesInDays, ...rest }) =>
    tenderInputSchema.parse({
      ...rest,
      publishedAt: daysFrom(now, -postedDaysAgo),
      closesAt: daysFrom(now, closesInDays),
    }),
  );
}

export async function seedFixtures(
  db: PrismaClient,
  { now = new Date() }: { now?: Date } = {},
): Promise<{ sourceId: string; count: number }> {
  const source = await db.source.upsert({
    where: { code: FIXTURE_SOURCE.code },
    update: { name: FIXTURE_SOURCE.name, baseUrl: FIXTURE_SOURCE.baseUrl, active: false },
    create: { ...FIXTURE_SOURCE },
  });

  const inputs = fixtureTenderInputs(now);
  for (const input of inputs) {
    const { externalId, ...data } = input;
    await db.tender.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId } },
      update: data,
      create: { ...data, externalId, sourceId: source.id },
    });
  }

  return { sourceId: source.id, count: inputs.length };
}
