"use server";

import { OpportunityList } from "@/components/opportunities/list";
import { parseQuery } from "@/components/opportunities/query-url";
import { prisma } from "@/lib/db";
import { listOpportunities } from "@/lib/opportunities";
import { getSession } from "@/lib/session";

export type LoadMoreResult = {
  rows: React.ReactNode;
  count: number;
  nextCursor: string | null;
};

// "Show more" on the list: renders the next page's rows on the server (the
// same OpportunityList the page uses) so the client can append them in
// place without leaving the current page. Re-verifies the session, like a
// route handler would.
export async function loadMoreOpportunities(search: string): Promise<LoadMoreResult> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  const profile = await prisma.companyProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!profile) return { rows: null, count: 0, nextCursor: null };

  const query = parseQuery(new URLSearchParams(search));
  const now = new Date();
  const page = await listOpportunities(prisma, { query, profileId: profile.id, now });

  return {
    rows: page.items.length ? <OpportunityList items={page.items} now={now} continued /> : null,
    count: page.items.length,
    nextCursor: page.nextCursor,
  };
}
