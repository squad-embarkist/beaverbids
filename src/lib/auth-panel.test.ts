import { describe, expect, it, vi } from "vitest";
import { getWaitingCounts, weekdayName } from "./auth-panel";

describe("weekdayName", () => {
  it("names the day in Eastern time", () => {
    // 03:00 UTC on a Wednesday is still Tuesday evening in Toronto.
    expect(weekdayName(new Date("2026-11-04T03:00:00Z"))).toBe("Tuesday");
    expect(weekdayName(new Date("2026-11-04T15:00:00Z"))).toBe("Wednesday");
  });
});

describe("getWaitingCounts", () => {
  const now = new Date("2026-11-04T15:00:00Z");

  it("counts open tenders published since the last successful import and those closing within 7 days", async () => {
    const finishedAt = new Date("2026-11-03T14:05:00Z");
    const count = vi.fn(async () => 0).mockResolvedValueOnce(24).mockResolvedValueOnce(5);
    const db = {
      ingestRun: { findFirst: vi.fn(async () => ({ finishedAt })) },
      tender: { count },
    };
    const counts = await getWaitingCounts(db as never, now);

    expect(counts).toEqual({ sinceDay: "Tuesday", newSince: 24, closingThisWeek: 5 });
    expect(db.ingestRun.findFirst).toHaveBeenCalledWith({ where: { status: "SUCCEEDED", finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } });
    const [newSinceArgs, closingArgs] = count.mock.calls as unknown as [{ where: { AND: unknown[] } }][];
    expect(newSinceArgs[0].where.AND).toContainEqual({ publishedAt: { gte: finishedAt } });
    expect(newSinceArgs[0].where.AND).toContainEqual({ source: { active: true } });
    expect(closingArgs[0].where.AND).toContainEqual({ closesAt: { lte: new Date("2026-11-11T15:00:00Z") } });
  });

  it("falls back to the last 24 hours when nothing has been imported", async () => {
    const db = { ingestRun: { findFirst: vi.fn(async () => null) }, tender: { count: vi.fn(async () => 0) } };
    const counts = await getWaitingCounts(db as never, now);
    expect(counts.sinceDay).toBe("Tuesday");
    const [[newSinceArgs]] = db.tender.count.mock.calls as unknown as [{ where: { AND: unknown[] } }][];
    expect(newSinceArgs.where.AND).toContainEqual({ publishedAt: { gte: new Date("2026-11-03T15:00:00Z") } });
  });
});
