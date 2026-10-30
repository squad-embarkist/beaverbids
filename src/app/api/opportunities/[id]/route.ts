import { connection } from "next/server";
import { apiError, apiJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getOpportunity } from "@/lib/opportunities";
import { getSession } from "@/lib/session";

// Listing detail as JSON: the tender, this user's score with its factors
// and reasons, and the official link (null when the source has none).
export async function GET(_request: Request, { params }: RouteContext<"/api/opportunities/[id]">) {
  await connection();

  const session = await getSession();
  if (!session) {
    return apiError(401, "UNAUTHORIZED", "Sign in to see this tender.");
  }

  const { id } = await params;
  const profile = await prisma.companyProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const item = await getOpportunity(prisma, { id, profileId: profile?.id ?? null });
  if (!item) {
    return apiError(404, "NOT_FOUND", "We could not find that tender.");
  }
  return apiJson(item);
}
