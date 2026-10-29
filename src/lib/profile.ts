import * as Sentry from "@sentry/nextjs";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getBoss } from "@/lib/boss";
import { log } from "@/lib/log";
import { enqueueScoreProfile } from "@/lib/queues";
import { stepNumber, type ProfileStepSave } from "@/lib/schemas/company-profile";

// Read and save helpers for the company profile, used by GET and PUT
// /api/profile and by the questionnaire pages. The route handler parses and
// authenticates; the database work is here so it can be unit tested.

const profileSelect = {
  id: true,
  name: true,
  website: true,
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
  questionnaireStep: true,
  updatedAt: true,
} satisfies Prisma.CompanyProfileSelect;

type ProfileRow = Prisma.CompanyProfileGetPayload<{ select: typeof profileSelect }>;

// What the screens and the API see: the questionnaire answers plus the
// progress counter. Dates are ISO strings so the object can cross to the client.
export type Profile = Omit<ProfileRow, "updatedAt"> & { updatedAt: string };

export function toProfile(row: ProfileRow): Profile {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

type Db = Pick<PrismaClient, "companyProfile">;

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const row = await db.companyProfile.findUnique({ where: { userId }, select: profileSelect });
  return row ? toProfile(row) : null;
}

export class ProfileMissingError extends Error {
  constructor() {
    super("The questionnaire starts with company basics.");
    this.name = "ProfileMissingError";
  }
}

// Saves one step. The basics step creates the profile when there is none;
// any other step needs an existing row. `questionnaireStep` only ever
// grows, so editing an early step later never hides the rest.
export async function saveProfileStep(db: Db, userId: string, save: ProfileStepSave): Promise<Profile> {
  const completed = stepNumber(save.step);
  const existing = await db.companyProfile.findUnique({ where: { userId }, select: { id: true, questionnaireStep: true } });

  if (!existing) {
    if (save.step !== "basics") throw new ProfileMissingError();
    const row = await db.companyProfile.create({
      data: { userId, ...save.answers, questionnaireStep: completed },
      select: profileSelect,
    });
    return toProfile(row);
  }

  const row = await db.companyProfile.update({
    where: { id: existing.id },
    data: { ...save.answers, questionnaireStep: Math.max(existing.questionnaireStep, completed) },
    select: profileSelect,
  });
  return toProfile(row);
}

// Queues a rescore for the saved profile. The id comes from the database
// row, never from the request. A failed send is logged and reported, not
// thrown: the save has already succeeded and the nightly run catches up.
export async function requestRescore(profileId: string): Promise<boolean> {
  try {
    const boss = await getBoss();
    const jobId = await enqueueScoreProfile(boss, profileId, "profileUpdated");
    log.info("score-profile queued", { profileId, jobId, deduplicated: jobId === null });
    return true;
  } catch (error) {
    log.error("score-profile enqueue failed", { profileId, error: String(error) });
    Sentry.captureException(error, { tags: { queue: "score-profile" }, extra: { profileId } });
    return false;
  }
}
