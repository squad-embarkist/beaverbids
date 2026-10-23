import { describe, expect, it } from "vitest";
import type { Requirements } from "../requirements";
import { profile, requirements } from "../test-helpers";
import type { ScoringProfile } from "../types";

type Row = { name: string; p: Partial<ScoringProfile>; r: Partial<Requirements>; expected: number };
import { scoreCredentials } from "./credentials";

describe("scoreCredentials (10)", () => {
  const rows: Row[] = [
    { name: "nothing asked for", p: {}, r: {}, expected: 10 },
    {
      name: "sample tender: SOC 2 or ISO 27001 with SOC 2 held, references with a description",
      p: { certifications: ["SOC 2 Type II"] },
      r: { certifications: ["SOC 2", "ISO 27001"], referencesRequired: true },
      expected: 7 + 2,
    },
    { name: "certification required and missing", p: {}, r: { certifications: ["ISO 27001"] }, expected: 0 + 3 },
    { name: "certification required and held", p: { certifications: ["ISO 27001:2013"] }, r: { certifications: ["ISO 27001"] }, expected: 10 },
    { name: "references with no description", p: { description: null }, r: { referencesRequired: true }, expected: 7 + 0 },
    { name: "references with a blank description", p: { description: "   " }, r: { referencesRequired: true }, expected: 7 },
    { name: "missing certification and no description", p: { description: null }, r: { certifications: ["P.Eng."], referencesRequired: true }, expected: 0 },
    { name: "an unrelated certification does not count", p: { certifications: ["COR safety certification"] }, r: { certifications: ["SOC 2"] }, expected: 3 },
  ];

  it.each(rows)("$name", ({ p, r, expected }) => {
    const result = scoreCredentials(profile(p), requirements(r));
    expect(result.points).toBe(expected);
    expect(result.max).toBe(10);
  });

  it("names the held and required certifications in its facts", () => {
    const result = scoreCredentials(profile({ certifications: ["SOC 2 Type II"] }), requirements({ certifications: ["SOC 2", "ISO 27001"] }));
    expect(result.facts).toMatchObject({ requiredCertifications: ["SOC 2", "ISO 27001"], heldCertifications: ["SOC 2"], certificationStatus: "held" });
  });
});
