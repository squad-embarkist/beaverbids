import { describe, expect, it } from "vitest";
import { profile, tender } from "../test-helpers";
import { scoreSize } from "./size";

describe("scoreSize (15)", () => {
  it.each([
    { name: "range inside the profile's range", t: {}, p: {}, expected: 14 },
    { name: "single value inside the range", t: { valueMin: 600_000, valueMax: 600_000 }, p: {}, expected: 15 },
    { name: "only a maximum published", t: { valueMin: null, valueMax: 600_000 }, p: {}, expected: 15 },
    { name: "unknown value scores half", t: { valueMin: null, valueMax: null }, p: {}, expected: 7 },
    { name: "profile with no range takes any value", t: { valueMin: 50_000_000, valueMax: 60_000_000 }, p: { sizeMin: null, sizeMax: null }, expected: 14 },
    { name: "profile with only a minimum", t: { valueMin: 50_000_000, valueMax: 60_000_000 }, p: { sizeMax: null }, expected: 14 },
    { name: "twice the maximum loses 3", t: { valueMin: 4_000_000, valueMax: 5_000_000 }, p: {}, expected: 9 + 2 },
    { name: "four times the maximum loses 6", t: { valueMin: 8_000_000, valueMax: 9_000_000 }, p: {}, expected: 6 + 2 },
    { name: "sixteen times the maximum loses everything but certainty", t: { valueMin: 32_000_000, valueMax: 40_000_000 }, p: {}, expected: 0 + 2 },
    { name: "a third below the minimum loses about 5", t: { valueMin: 20_000, valueMax: 33_000 }, p: {}, expected: Math.round(12 - 3 * Math.log2(100_000 / 33_000)) + 2 },
    { name: "just outside the range barely moves", t: { valueMin: 2_100_000, valueMax: 2_200_000 }, p: {}, expected: 12 + 2 },
    { name: "a range that overlaps the top of the profile range is inside", t: { valueMin: 1_500_000, valueMax: 2_500_000 }, p: {}, expected: 14 },
  ])("$name", ({ t, p, expected }) => {
    const result = scoreSize(tender(t), profile(p));
    expect(result.points).toBe(expected);
    expect(result.max).toBe(15);
  });

  it("reports the position in its facts", () => {
    expect(scoreSize(tender({ valueMin: 4_000_000, valueMax: 5_000_000 }), profile()).facts.position).toBe("above");
    expect(scoreSize(tender({ valueMin: 10, valueMax: 20 }), profile()).facts.position).toBe("below");
    expect(scoreSize(tender({ valueMin: null, valueMax: null }), profile()).facts.position).toBe("unknownValue");
    expect(scoreSize(tender(), profile({ sizeMin: null, sizeMax: null })).facts.position).toBe("noRange");
  });
});
