import { connection } from "next/server";
import { apiError, apiJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ProfileMissingError, getProfile, requestRescore, saveProfileStep } from "@/lib/profile";
import { profileStepSaveSchema } from "@/lib/schemas/company-profile";
import { getSession } from "@/lib/session";

// The signed-in user's company profile. GET reads it; PUT saves one
// questionnaire step and queues a rescore of that profile only.

export async function GET() {
  await connection();

  const session = await getSession();
  if (!session) {
    return apiError(401, "UNAUTHORIZED", "Sign in to see your profile.");
  }

  const profile = await getProfile(prisma, session.user.id);
  if (!profile) {
    return apiError(404, "NOT_FOUND", "You have not started the questionnaire yet.");
  }
  return apiJson(profile);
}

export async function PUT(request: Request) {
  await connection();

  const session = await getSession();
  if (!session) {
    return apiError(401, "UNAUTHORIZED", "Sign in to save your answers.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "BAD_REQUEST", "Send the step and its answers as JSON.");
  }

  const parsed = profileStepSaveSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "BAD_REQUEST",
      "Check your answers.",
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }

  let profile;
  try {
    profile = await saveProfileStep(prisma, session.user.id, parsed.data);
  } catch (error) {
    if (error instanceof ProfileMissingError) {
      return apiError(409, "CONFLICT", error.message);
    }
    throw error;
  }

  const rescoreQueued = await requestRescore(profile.id);
  return apiJson({ ...profile, rescoreQueued });
}
