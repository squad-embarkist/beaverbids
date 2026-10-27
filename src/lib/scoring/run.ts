import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { buildReasons, type ReasonSet } from "./reasons";
import { MODEL_VERSION, scoreTender } from "./score";
import type { ScoringProfile, ScoringTender } from "./types";

// Scores every open tender for every company profile (or one profile) and
// upserts the rows in the score table. Safe to rerun: the unique key on
// (tenderId, profileId) means a retry overwrites instead of duplicating.
// Runs in the worker, never in a web request.

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
): ScoreRow {
  const result = scoreTender(tender, profile, now);
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
    },
  });

  const tenders = await db.tender.findMany({
    where: { closesAt: { gt: now } },
    select: {
      id: true,
      title: true,
      description: true,
      buyerType: true,
      categoryCodes: true,
      region: true,
      valueMin: true,
      valueMax: true,
      closesAt: true,
      language: true,
    },
  });

  const rows: ScoreRow[] = [];
  for (const profile of profiles) {
    for (const tender of tenders) {
      rows.push(scoreRow(tender, profile, now));
    }
  }

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

  return { profiles: profiles.length, tenders: tenders.length, scored: rows.length, modelVersion: MODEL_VERSION };
}
