import { APIError } from "better-auth/api";
import type { PrismaClient } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { SAMPLE_PROFILE } from "./sample-profile";

// A development sign-in with the sample company profile attached. Never
// runs in production (see prisma/seed.ts).

export const DEV_ACCOUNT = {
  name: "Dev Tester",
  email: "dev@beaverbids.test",
  password: "beaverbids-dev",
} as const;


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
