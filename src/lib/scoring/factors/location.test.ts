import { describe, expect, it } from "vitest";
import type { Requirements } from "../requirements";
import { profile, requirements, tender } from "../test-helpers";
import type { ScoringProfile, ScoringTender } from "../types";

type Row = { name: string; t: Partial<ScoringTender>; p: Partial<ScoringProfile>; r: Partial<Requirements>; expected: number };
import { languageMatch, regionMatches, scoreLocation } from "./location";

describe("regionMatches", () => {
  it.each([
    [["ON"], ["ON"], true],
    [["ON"], ["BC"], false],
    [["CA"], ["BC"], true],
    [["QC"], ["CA"], true],
    [["NU"], ["MB", "SK", "NU"], true],
    // Several provinces on the notice: any one in common is a match.
    [["ON", "QC"], ["QC"], true],
    [["ON", "QC"], ["BC", "AB"], false],
    [["ON", "CA"], ["BC"], true],
  ])("tender %j vs profile %j is %s", (tenderRegions, profileRegions, expected) => {
    expect(regionMatches(tenderRegions, profileRegions)).toBe(expected);
  });
});

describe("languageMatch", () => {
  it.each([
    ["EN", "EN", "full"],
    ["FR", "FR", "full"],
    ["EN_FR", "EN_FR", "full"],
    ["FR", "EN_FR", "full"],
    ["EN_FR", "EN", "partial"],
    ["EN_FR", "FR", "partial"],
    ["FR", "EN", "none"],
    ["EN", "FR", "none"],
  ] as const)("tender %s vs profile %s is %s", (t, p, expected) => {
    expect(languageMatch(t, p)).toBe(expected);
  });
});

describe("scoreLocation (20)", () => {
  const rows: Row[] = [
    { name: "everything met, nothing detected", t: {}, p: {}, r: {}, expected: 20 },
    {
      name: "sample tender: residency met, bond not met",
      t: {},
      p: {},
      r: { residencyCanada: true, bondRequired: true },
      expected: 12 + 5 + 2,
    },
    { name: "province outside the profile", t: { regions: ["BC"] }, p: {}, r: {}, expected: 8 },
    { name: "national tender for a provincial profile", t: { regions: ["CA"] }, p: {}, r: {}, expected: 20 },
    { name: "French-only notice for an English profile", t: { language: "FR" }, p: {}, r: {}, expected: 15 },
    { name: "bilingual notice for an English profile", t: { language: "EN_FR" }, p: {}, r: {}, expected: 18 },
    { name: "bilingual text on an English notice counts as bilingual", t: {}, p: {}, r: { bilingualRequired: true }, expected: 18 },
    { name: "bilingual profile covers everything", t: { language: "FR" }, p: { languages: "EN_FR" }, r: {}, expected: 20 },
    { name: "bond required and held", t: {}, p: { bonding: true }, r: { bondRequired: true }, expected: 20 },
    { name: "clearance required and none held", t: {}, p: {}, r: { clearanceRequired: true }, expected: 17 },
    { name: "clearance required and any level held (rules-3)", t: {}, p: { securityClearance: "reliability" }, r: { clearanceRequired: true }, expected: 20 },
    {
      name: "residency needs a head office province",
      t: {},
      p: { headOfficeProvince: null },
      r: { residencyCanada: true },
      expected: 17,
    },
    {
      name: "one of three checks met rounds to 1",
      t: {},
      p: {},
      r: { residencyCanada: true, bondRequired: true, clearanceRequired: true },
      expected: 12 + 5 + 1,
    },
  ];

  it.each(rows)("$name", ({ t, p, r, expected }) => {
    const result = scoreLocation(tender(t), profile(p), requirements(r));
    expect(result.points).toBe(expected);
    expect(result.max).toBe(20);
  });
});
