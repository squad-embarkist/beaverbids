import { describe, expect, it } from "vitest";
import { loadGoldenCases } from "./golden";
import { buildReasons } from "./reasons";
import { scoreTender } from "./score";
import { parseFactors, parseReasons } from "./stored";

describe("stored score JSON", () => {
  const sample = loadGoldenCases().find((c) => c.pair.id === "sample-it-managed-services")!;
  const result = scoreTender(sample.tender, sample.profile, sample.now);

  it("reads back what the engine writes", () => {
    expect(parseFactors(result.factors)).toEqual(result.factors);
    const reasons = buildReasons(result, sample.tender);
    expect(parseReasons(JSON.parse(JSON.stringify(reasons)))).toEqual(reasons);
  });

  it("returns null for a row it does not understand", () => {
    expect(parseFactors({ category: 38 })).toBeNull();
    expect(parseFactors(null)).toBeNull();
    expect(parseReasons({ inFavour: [{ code: "madeUp", params: {}, text: "" }], gaps: [], ruleOut: [], summary: [] })).toBeNull();
    expect(parseReasons("x")).toBeNull();
  });
});
