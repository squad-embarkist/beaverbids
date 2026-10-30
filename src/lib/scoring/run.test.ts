import { describe, expect, it, vi } from "vitest";
import { scoreAll, scoreRow } from "./run";
import { NOW, daysFromNow, profile, tender } from "./test-helpers";

// The real extractor, wrapped so the per-tender call count can be checked.
const extractRequirements = vi.hoisted(() => vi.fn());
vi.mock("./requirements", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./requirements")>();
  extractRequirements.mockImplementation(actual.extractRequirements);
  return { ...actual, extractRequirements };
});

// Fake Prisma client: findMany returns the arrays given, upsert is recorded,
// $transaction awaits what it is given.
function fakeDb(profiles: ReturnType<typeof profile>[], tenders: ReturnType<typeof tender>[]) {
  const upserts: unknown[] = [];
  const db = {
    companyProfile: { findMany: vi.fn(async () => profiles.map((p, i) => ({ id: `p${i}`, ...p }))) },
    tender: {
      findMany: vi.fn(async ({ where }: { where: { AND: { closesAt?: { gt: Date } }[] } }) => {
        const closing = where.AND.find((f) => f.closesAt)?.closesAt?.gt ?? new Date(0);
        return tenders.map((t, i) => ({ id: `t${i}`, ...t })).filter((t) => t.closesAt > closing);
      }),
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
    expect(row).toMatchObject({ tenderId: "t1", profileId: "p1", band: "HIGH", eligible: true, modelVersion: "rules-4", scoredAt: NOW });
    expect(row.factors).toEqual(expect.objectContaining({ category: expect.any(Number) }));
    expect(row.reasons).toEqual(expect.objectContaining({ inFavour: expect.any(Array), summary: expect.any(Array) }));
    const reasons = row.reasons as { summary: { code: string; text: string }[] };
    expect(reasons.summary[0]).toEqual({ code: expect.any(String), params: expect.any(Object), text: expect.any(String) });
  });
});

describe("scoreAll", () => {
  it("scores every open tender for every profile and upserts on the pair", async () => {
    const { db, upserts, mocks } = fakeDb([profile(), profile({ regions: ["BC"] })], [tender(), tender({ regions: ["BC"] }), tender({ closesAt: daysFromNow(-1) })]);

    const summary = await scoreAll(db, { now: NOW });

    expect(summary).toEqual({ profiles: 2, tenders: 2, scored: 4, modelVersion: "rules-4" });
    // The open-tender rules shared with the list: closed, withdrawn, non-bid
    // and inactive-source rows are never scored.
    expect(mocks.tender.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ closesAt: { gt: NOW } }, { withdrawnAt: null }, { noticeKind: { in: ["BID", "UNKNOWN"] } }, { source: { active: true } }] }, orderBy: { id: "asc" } }),
    );
    // One write per profile, so the whole set is never in memory at once.
    expect(mocks.$transaction).toHaveBeenCalledTimes(2);
    expect(upserts).toHaveLength(4);
    expect(upserts[0]).toMatchObject({
      where: { tenderId_profileId: { tenderId: "t0", profileId: "p0" } },
      create: { tenderId: "t0", profileId: "p0", modelVersion: "rules-4" },
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

  it("writes in batches, per profile", async () => {
    const { db, mocks } = fakeDb([profile()], Array.from({ length: 7 }, () => tender()));
    await scoreAll(db, { now: NOW, batchSize: 3 });
    expect(mocks.$transaction).toHaveBeenCalledTimes(3);

    const two = fakeDb([profile(), profile()], Array.from({ length: 7 }, () => tender()));
    await scoreAll(two.db, { now: NOW, batchSize: 3 });
    expect(two.mocks.$transaction).toHaveBeenCalledTimes(6);
  });

  it("extracts the requirements once per tender, not once per pair", async () => {
    const { db } = fakeDb([profile(), profile(), profile()], [tender(), tender()]);
    extractRequirements.mockClear();
    await scoreAll(db, { now: NOW });
    expect(extractRequirements).toHaveBeenCalledTimes(2);
  });

  it("does nothing without profiles", async () => {
    const { db, mocks } = fakeDb([], [tender()]);
    const summary = await scoreAll(db, { now: NOW });
    expect(summary.scored).toBe(0);
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });
});
