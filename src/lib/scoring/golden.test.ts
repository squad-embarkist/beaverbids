import { describe, expect, it } from "vitest";
import { SAMPLE_PROFILE } from "@/lib/seed/sample-profile";
import { loadGoldenCases } from "./golden";
import { buildReasons } from "./reasons";
import { scoreTender } from "./score";

// The golden set: 20 fixture tender and profile pairs with the expected
// band. A rule change that moves a pair across a band fails here and needs
// a note in the pull request.

const cases = loadGoldenCases();

describe("golden set", () => {
  it("has 23 pairs with unique ids", () => {
    expect(cases).toHaveLength(23);
    expect(new Set(cases.map((c) => c.pair.id)).size).toBe(23);
  });

  it("has at least two eligible pairs that the category cap lowers", () => {
    const lowered = cases.filter((c) => {
      const result = scoreTender(c.tender, c.profile, c.now);
      return result.eligible && result.cap && result.cap.uncappedTotal > result.total;
    });
    expect(lowered.length).toBeGreaterThanOrEqual(2);
  });

  it("covers every band and both gate outcomes", () => {
    const bands = new Set(cases.map((c) => c.pair.expectedBand));
    expect(bands).toEqual(new Set(["HIGH", "MEDIUM", "LOW"]));
    expect(cases.some((c) => !c.pair.expectedEligible)).toBe(true);
  });

  it("keeps the golden sample profile in step with the seeded one", () => {
    const golden = cases.find((c) => c.pair.id === "sample-it-managed-services")!.profile;
    const seeded: Record<string, unknown> = { ...SAMPLE_PROFILE };
    delete seeded.name;
    delete seeded.website;
    expect(golden).toMatchObject(seeded);
  });

  it.each(cases.map((c) => [c.pair.id, c] as const))("%s", (_id, { pair, tender, profile, now }) => {
    const result = scoreTender(tender, profile, now);
    expect(result.eligible, "eligible").toBe(pair.expectedEligible);
    expect(result.band, `band (total ${result.total})`).toBe(pair.expectedBand);
    if (pair.expectedTotal != null) expect(result.total).toBe(pair.expectedTotal);
    if (pair.expectedFactors) expect(result.factors).toEqual(pair.expectedFactors);
    if (pair.expectedCapped != null) expect(Boolean(result.cap), "capped").toBe(pair.expectedCapped);
    // The factors are stored as computed; only the total is capped.
    const sum = Object.values(result.factors).reduce((a, b) => a + b, 0);
    expect(result.cap ? result.cap.uncappedTotal : result.total).toBe(sum);

    const reasons = buildReasons(result, tender);
    expect(reasons.summary.length).toBeGreaterThanOrEqual(2);
    expect(reasons.summary.length).toBeLessThanOrEqual(3);
  });

  it("scores the sample IT Managed Services tender at 92 with 38, 19, 14, 12 and 9", () => {
    const { tender, profile, now } = cases.find((c) => c.pair.id === "sample-it-managed-services")!;
    const result = scoreTender(tender, profile, now);
    expect(result.total).toBe(92);
    expect(result.band).toBe("HIGH");
    expect(result.factors).toEqual({ category: 38, location: 19, size: 14, timeline: 12, credentials: 9 });
    expect(result.cap).toBeNull();
  });
});
