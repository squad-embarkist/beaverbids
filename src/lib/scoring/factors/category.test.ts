import { describe, expect, it } from "vitest";
import { profile, requirements, tender } from "../test-helpers";
import { scoreCategory } from "./category";

describe("scoreCategory (40)", () => {
  it.each([
    {
      name: "full match with every keyword",
      t: {},
      p: {},
      r: { keywordHits: { "it-managed-services-cloud": ["managed services", "help desk", "cloud", "network", "data centre"] } },
      expected: 40,
    },
    {
      name: "sample tender: code, buyer and four of five keywords",
      t: {},
      p: {},
      r: { keywordHits: { "it-managed-services-cloud": ["managed services", "help desk", "cloud", "network"] } },
      expected: 38,
    },
    { name: "code and buyer, no keywords", t: {}, p: {}, r: {}, expected: 32 },
    { name: "unknown buyer type gets half the buyer points", t: { buyerType: null }, p: {}, r: {}, expected: 28 },
    { name: "buyer type not on the list", t: { buyerType: "federal" }, p: {}, r: {}, expected: 24 },
    { name: "a profile with no buyer types works with anyone", t: {}, p: { buyerTypes: [] }, r: {}, expected: 32 },
    { name: "no category match, no keywords", t: { categoryCodes: ["commercial-construction"] }, p: {}, r: {}, expected: 8 },
    {
      name: "no code match still earns keywords from the best profile category",
      t: { categoryCodes: ["commercial-construction"] },
      p: { categories: ["it-managed-services-cloud", "cybersecurity-data-protection"] },
      r: { keywordHits: { "cybersecurity-data-protection": ["security", "privacy"] } },
      expected: 8 + 3,
    },
    {
      name: "half the tender codes matched",
      t: { categoryCodes: ["it-managed-services-cloud", "cybersecurity-data-protection"] },
      p: {},
      r: {},
      expected: 12 + 8,
    },
    {
      name: "no codes on the tender: keyword share drives the code points",
      t: { categoryCodes: [] },
      p: {},
      r: { keywordHits: { "it-managed-services-cloud": ["help desk", "cloud"] } },
      expected: Math.round(24 * 0.4) + 8 + Math.round(8 * 0.4),
    },
  ])("$name", ({ t, p, r, expected }) => {
    const result = scoreCategory(tender(t), profile(p), requirements(r));
    expect(result.points).toBe(expected);
    expect(result.max).toBe(40);
  });

  it("exposes the sub-points and the matched codes in its facts", () => {
    const result = scoreCategory(
      tender(),
      profile(),
      requirements({ keywordHits: { "it-managed-services-cloud": ["help desk", "cloud", "network", "managed services"] } }),
    );
    expect(result.facts).toMatchObject({
      matchedCodes: ["it-managed-services-cloud"],
      buyerMatch: "match",
      codePoints: 24,
      buyerPoints: 8,
      keywordPoints: 6,
    });
  });
});
