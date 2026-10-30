import { connection } from "next/server";
import { apiError, apiJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { listOpportunities } from "@/lib/opportunities";
import { opportunitiesQuerySchema, queryObjectFrom } from "@/lib/schemas/opportunities";
import { getSession } from "@/lib/session";

// Scored list for the signed-in user. Query parameters, pagination and the
// response shape are in docs/development-guide.md and src/lib/opportunities.ts.
export async function GET(request: Request) {
  await connection();

  const session = await getSession();
  if (!session) {
    return apiError(401, "UNAUTHORIZED", "Sign in to see opportunities.");
  }

  const parsed = opportunitiesQuerySchema.safeParse(
    queryObjectFrom(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return apiError(
      400,
      "BAD_REQUEST",
      "Check the query parameters.",
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }

  // Users who have not finished the questionnaire yet still see the list.
  const profile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const page = await listOpportunities(prisma, {
    query: parsed.data,
    profileId: profile?.id ?? null,
  });

  return apiJson(page);
}
