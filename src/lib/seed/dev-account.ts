import { APIError } from "better-auth/api";
import type { PrismaClient } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { companyProfileSchema, type CompanyProfileInput } from "@/lib/schemas/company-profile";

// A development sign-in plus the sample company profile from the wireframes'
// "Scoring you against" panel. The M2 golden set scores the sample tender at
// 92 for this profile. Never runs in production (see prisma/seed.ts).

export const DEV_ACCOUNT = {
  name: "Dev Tester",
  email: "dev@beaverbids.test",
  password: "beaverbids-dev",
} as const;

export const SAMPLE_PROFILE: CompanyProfileInput = companyProfileSchema.parse({
  name: "Sample Technology Partners Inc.",
  website: "https://sample-technology.example.com",
  headOfficeProvince: "ON",
  capacity: "6-10",
  categories: ["it-managed-services-cloud", "cybersecurity-data-protection", "custom-software-saas"],
  buyerTypes: ["municipal", "provincial", "health-authority", "crown-utility"],
  description:
    "Managed IT, cloud migrations and security assessments for public sector teams of 200 to 2,000 staff.",
  languages: "EN",
  regions: ["ON"],
  sizeMin: 250_000,
  sizeMax: 3_000_000,
  timelinePref: 10,
  certifications: ["SOC 2 Type II"],
  bonding: false,
});

export async function seedDevAccount(db: PrismaClient): Promise<{ userId: string; profileId: string }> {
  let user = await db.user.findUnique({ where: { email: DEV_ACCOUNT.email } });

  if (!user) {
    try {
      await auth.api.signUpEmail({ body: { ...DEV_ACCOUNT } });
    } catch (error) {
      if (!(error instanceof APIError)) throw error;
      // Another seed run created it between the lookup and the sign-up.
    }
    user = await db.user.findUniqueOrThrow({ where: { email: DEV_ACCOUNT.email } });
  }

  const profile = await db.companyProfile.upsert({
    where: { userId: user.id },
    update: { ...SAMPLE_PROFILE, questionnaireStep: 5 },
    create: { ...SAMPLE_PROFILE, userId: user.id, questionnaireStep: 5 },
  });

  return { userId: user.id, profileId: profile.id };
}
