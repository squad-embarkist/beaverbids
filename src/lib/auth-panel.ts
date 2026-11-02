import type { PrismaClient } from "@/generated/prisma/client";
import { openTenderFilters } from "@/lib/tenders";

// The two real counts on the Log in panel's "WAITING FOR YOU" card
// (docs/plans/account-flow-plan.md, D4). Nobody is logged in yet, so they
// are global: open tenders published since the last successful import
// ("New since Tuesday"), and open tenders closing within seven days. With
// no import yet (a laptop) "since" is a day ago.

export type WaitingCounts = { sinceDay: string; newSince: number; closingThisWeek: number };

export const CLOSING_WINDOW_DAYS = 7;

export async function getWaitingCounts(db: Pick<PrismaClient, "tender" | "ingestRun">, now: Date = new Date()): Promise<WaitingCounts> {
  const lastRun = await db.ingestRun.findFirst({ where: { status: "SUCCEEDED", finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } });
  const since = lastRun?.finishedAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const open = openTenderFilters(now);
  const [newSince, closingThisWeek] = await Promise.all([
    db.tender.count({ where: { AND: [...open, { publishedAt: { gte: since } }] } }),
    db.tender.count({ where: { AND: [...open, { closesAt: { lte: new Date(now.getTime() + CLOSING_WINDOW_DAYS * 24 * 60 * 60 * 1000) } }] } }),
  ]);
  return { sinceDay: weekdayName(since), newSince, closingThisWeek };
}

// "Tuesday", in the product's time zone (docs/ui-ux-guide.md: Eastern).
export function weekdayName(date: Date, locale = "en-CA"): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "America/Toronto" }).format(date);
}
