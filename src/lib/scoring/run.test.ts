import { describe, expect, it, vi } from "vitest";
import { scoreAll, scoreRow } from "./run";
import { NOW, daysFromNow, profile, tender } from "./test-helpers";

// Fake Prisma client: findMany returns the arrays given, upsert is recorded,
// $transaction awaits what it is given.
function fakeDb(profiles: ReturnType<typeof profile>[], tenders: ReturnType<typeof tender>[]) {
  const upserts: unknown[] = [];
  const db = {
    companyProfile: { findMany: vi.fn(async () => profiles.map((p, i) => ({ id: `p${i}`, ...p }))) },
    tender: {
      findMany: vi.fn(async ({ where }: { where: { closesAt: { gt: Date } } }) =>
        tenders.map((t, i) => ({ id: `t${i}`, ...t })).filter((t) => t.closesAt > where.closesAt.gt),
      ),
    },
    score: {
      upsert: vi.fn((args: unknown) => {
        upserts.push(args);
        return args;
      }),
    },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  };
  return { db: db as unknown as Parameters<typeof scoreAll>[0], upserts, mocks: db };
}

describe("scoreRow", () => {
  it("builds a score row with factors, reasons and the model version", () => {
    const row = scoreRow({ id: "t1", ...tender() }, { id: "p1", ...profile() }, NOW);
    expect(row).toMatchObject({ tenderId: "t1", profileId: "p1", band: "HIGH", eligible: true, modelVersion: "rules-2", scoredAt: NOW });
    expect(row.factors).toEqual(expect.objectContaining({ category: expect.any(Number) }));
    expect(row.reasons).toEqual(expect.objectContaining({ inFavour: expect.any(Array), summary: expect.any(Array) }));
    const reasons = row.reasons as { summary: { code: string; text: string }[] };
    expect(reasons.summary[0]).toEqual({ code: expect.any(String), params: expect.any(Object), text: expect.any(String) });
  });
});

describe("scoreAll", () => {
  it("scores every open tender for every profile and upserts on the pair", async () => {
    const { db, upserts, mocks } = fakeDb([profile(), profile({ regions: ["BC"] })], [tender(), tender({ region: "BC" }), tender({ closesAt: daysFromNow(-1) })]);

    const summary = await scoreAll(db, { now: NOW });

    expect(summary).toEqual({ profiles: 2, tenders: 2, scored: 4, modelVersion: "rules-2" });
    expect(mocks.tender.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { closesAt: { gt: NOW } } }));
    expect(upserts).toHaveLength(4);
    expect(upserts[0]).toMatchObject({
      where: { tenderId_profileId: { tenderId: "t0", profileId: "p0" } },
      create: { tenderId: "t0", profileId: "p0", modelVersion: "rules-2" },
    });
    const pairs = upserts.map((u) => (u as { where: { tenderId_profileId: { tenderId: string; profileId: string } } }).where.tenderId_profileId);
    expect(pairs).toEqual([
      { tenderId: "t0", profileId: "p0" },
      { tenderId: "t1", profileId: "p0" },
      { tenderId: "t0", profileId: "p1" },
      { tenderId: "t1", profileId: "p1" },
    ]);
  });

  it("scores one profile when profileId is given", async () => {
    const { db, mocks } = fakeDb([profile()], [tender()]);
    await scoreAll(db, { profileId: "p0", now: NOW });
    expect(mocks.companyProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p0" } }));
  });

  it("writes in batches", async () => {
    const { db, mocks } = fakeDb([profile()], Array.from({ length: 7 }, () => tender()));
    await scoreAll(db, { now: NOW, batchSize: 3 });
    expect(mocks.$transaction).toHaveBeenCalledTimes(3);
  });

  it("does nothing without profiles", async () => {
    const { db, mocks } = fakeDb([], [tender()]);
    const summary = await scoreAll(db, { now: NOW });
    expect(summary.scored).toBe(0);
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });
});
