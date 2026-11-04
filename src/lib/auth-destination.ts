import type { PrismaClient } from "@/generated/prisma/client";
import { nextIncompleteStep } from "@/lib/schemas/company-profile";

// Where a signed-in person lands: the scored list, or the first
// questionnaire step still to finish. Shared by the log-in action and the
// confirmation landing route.
export async function destinationFor(db: Pick<PrismaClient, "companyProfile">, userId: string): Promise<string> {
  const profile = await db.companyProfile.findUnique({ where: { userId }, select: { questionnaireStep: true } });
  const pending = nextIncompleteStep(profile?.questionnaireStep ?? 0);
  return pending ? `/questionnaire/${pending}` : "/opportunities";
}
