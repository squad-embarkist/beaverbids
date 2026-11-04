import type { Prisma } from "@/generated/prisma/client";
import { LISTED_NOTICE_KINDS } from "@/lib/schemas/vocab";

// The one definition of a tender that is "open" for the product: scoring
// (src/lib/scoring/run.ts) and the list (src/lib/opportunities.ts) both
// start from these filters, so a notice hidden from one is hidden from the
// other. A row fails them when it has closed, left the source's open file
// (withdrawnAt set), is not a call for bids, or belongs to an inactive
// source (the fixtures in production, or a portal switched off by hand).
export function openTenderFilters(now: Date): Prisma.TenderWhereInput[] {
  return [{ closesAt: { gt: now } }, { withdrawnAt: null }, { noticeKind: { in: [...LISTED_NOTICE_KINDS] } }, { source: { active: true } }];
}
