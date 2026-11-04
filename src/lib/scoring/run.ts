import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { openTenderFilters } from "@/lib/tenders";
import { buildReasons, type ReasonSet } from "./reasons";
import { extractRequirements, type Requirements } from "./requirements";
import { MODEL_VERSION, scoreTender } from "./score";
import type { ScoringProfile, ScoringTender } from "./types";

// Scores every open tender (src/lib/tenders.ts: not closed, not withdrawn,
// a call for bids, from an active source) for every company profile (or one
// profile) and upserts the rows in the score table. Safe to rerun: the
// unique key on (tenderId, profileId) means a retry overwrites instead of
// duplicating. Runs in the worker, never in a web request.
//
// Memory and locks (M2 review follow-ups, built in M4): the text extractor
// runs once per tender, not once per pair, and the rows are scored and
// written one profile at a time, so the whole set is never in memory at
// once. Tenders are read in id order and written in that order inside
// every batch, so a score-profile job running beside the nightly score-all
// takes its row locks in the same order and the two cannot deadlock.

export type ScoreAllOptions = {
  profileId?: string;
  now?: Date;
  batchSize?: number;
};

export type ScoreAllSummary = {
  profiles: number;
  tenders: number;
  scored: number;
  modelVersion: string;
};

type Db = Pick<PrismaClient, "companyProfile" | "tender" | "score" | "$transaction">;

export type ScoreRow = {
  tenderId: string;
  profileId: string;
  total: number;
  band: "HIGH" | "MEDIUM" | "LOW";
  eligible: boolean;
  factors: Prisma.InputJsonValue;
  reasons: Prisma.InputJsonValue;
  modelVersion: string;
  scoredAt: Date;
};

export function scoreRow(
  tender: ScoringTender & { id: string },
  profile: ScoringProfile & { id: string },
  now: Date,
  requirements: Requirements = extractRequirements(tender),
): ScoreRow {
  const result = scoreTender(tender, profile, now, requirements);
  const reasons: ReasonSet = buildReasons(result, tender);
  return {
    tenderId: tender.id,
    profileId: profile.id,
    total: result.total,
    band: result.band,
    eligible: result.eligible,
    factors: result.factors,
    reasons: reasons as unknown as Prisma.InputJsonValue,
    modelVersion: MODEL_VERSION,
    scoredAt: now,
  };
}

export async function scoreAll(db: Db, { profileId, now = new Date(), batchSize = 100 }: ScoreAllOptions = {}): Promise<ScoreAllSummary> {
  const profiles = await db.companyProfile.findMany({
    where: profileId ? { id: profileId } : undefined,
    select: {
      id: true,
      headOfficeProvince: true,
      capacity: true,
      categories: true,
      buyerTypes: true,
      description: true,
      languages: true,
      regions: true,
      sizeMin: true,
      sizeMax: true,
      timelinePref: true,
      certifications: true,
      bonding: true,
      securityClearance: true,
      indigenousBusiness: true,
    },
  });

  const tenders = await db.tender.findMany({
    where: { AND: openTenderFilters(now) },
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      buyerType: true,
      categoryCodes: true,
      regions: true,
      valueMin: true,
      valueMax: true,
      closesAt: true,
      language: true,
    },
  });

  const extracted = profiles.length > 0 ? tenders.map((tender) => ({ tender, requirements: extractRequirements(tender) })) : [];

  let scored = 0;
  for (const profile of profiles) {
    const rows = extracted.map(({ tender, requirements }) => scoreRow(tender, profile, now, requirements));
    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize);
      await db.$transaction(
        batch.map(({ tenderId, profileId: pid, ...data }) =>
          db.score.upsert({
            where: { tenderId_profileId: { tenderId, profileId: pid } },
            update: data,
            create: { tenderId, profileId: pid, ...data },
          }),
        ),
      );
    }
    scored += rows.length;
  }

  return { profiles: profiles.length, tenders: tenders.length, scored, modelVersion: MODEL_VERSION };
}
