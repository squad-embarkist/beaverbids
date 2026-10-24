import { z } from "zod";
import { companyProfileSchema } from "@/lib/schemas/company-profile";
import { scoreBand } from "@/lib/schemas/vocab";
import { fixtureTenderInputs, type FixtureFile } from "@/lib/seed/fixtures";
import tenderFile from "../../../fixtures/tenders.json";
import goldenFile from "../../../fixtures/golden.json";
import type { ScoringProfile, ScoringTender } from "./types";

// Loader for fixtures/golden.json: 20 tender and profile pairs with the
// expected band. Tenders are the fixture tenders by external id, resolved
// against the file's fixed `now`; a pair may patch tender fields (for a
// case no fixture carries, such as a set-aside).

const factorPointsSchema = z.object({
  category: z.number().int(),
  location: z.number().int(),
  size: z.number().int(),
  timeline: z.number().int(),
  credentials: z.number().int(),
});

const pairSchema = z.object({
  id: z.string().min(1),
  note: z.string().optional(),
  profile: z.string().min(1),
  tender: z.string().min(1),
  overrides: z
    .object({
      description: z.string().min(1).optional(),
      closesInDays: z.number().int().min(1).optional(),
    })
    .optional(),
  expectedEligible: z.boolean(),
  expectedBand: scoreBand,
  expectedTotal: z.number().int().min(0).max(100).optional(),
  expectedCapped: z.boolean().optional(),
  expectedFactors: factorPointsSchema.optional(),
});

const goldenSchema = z.object({
  _fixture: z.string(),
  now: z.iso.datetime(),
  profiles: z.record(z.string(), companyProfileSchema),
  pairs: z.array(pairSchema),
});

export type GoldenPair = z.infer<typeof pairSchema>;

export type GoldenCase = {
  pair: GoldenPair;
  profile: ScoringProfile & { name: string };
  tender: ScoringTender & { externalId: string; title: string; description: string };
  now: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function loadGoldenCases(): GoldenCase[] {
  const golden = goldenSchema.parse(goldenFile);
  const now = new Date(golden.now);
  const tenders = new Map(fixtureTenderInputs(now, tenderFile as FixtureFile).map((t) => [t.externalId, t]));

  return golden.pairs.map((pair) => {
    const profile = golden.profiles[pair.profile];
    if (!profile) throw new Error(`golden pair ${pair.id}: unknown profile ${pair.profile}`);
    const base = tenders.get(pair.tender);
    if (!base) throw new Error(`golden pair ${pair.id}: unknown tender ${pair.tender}`);

    const tender = {
      ...base,
      ...(pair.overrides?.description ? { description: pair.overrides.description } : {}),
      ...(pair.overrides?.closesInDays ? { closesAt: new Date(now.getTime() + pair.overrides.closesInDays * DAY_MS) } : {}),
    };

    return { pair, profile, tender, now };
  });
}
