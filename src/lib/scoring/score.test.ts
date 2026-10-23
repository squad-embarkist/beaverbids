import { describe, expect, it } from "vitest";
import { bandForTotal } from "@/lib/schemas/vocab";
import { checkGate } from "./gate";
import { MODEL_VERSION, scoreTender } from "./score";
import { NOW, daysFromNow, profile, requirements, tender } from "./test-helpers";

describe("checkGate", () => {
  it("passes when the region matches and there is no set-aside", () => {
    expect(checkGate(tender(), profile(), requirements())).toEqual({ eligible: true, blockers: [] });
  });

  it.each([
    { name: "province outside the profile", t: { region: "BC" }, p: {}, r: {}, blockers: [{ code: "regionMismatch", region: "BC" }] },
    { name: "set-aside for a group", t: {}, p: {}, r: { setAside: "indigenous businesses" }, blockers: [{ code: "setAside", group: "indigenous businesses" }] },
    {
      name: "both at once",
      t: { region: "QC" },
      p: {},
      r: { setAside: "small businesses" },
      blockers: [
        { code: "regionMismatch", region: "QC" },
        { code: "setAside", group: "small businesses" },
      ],
    },
  ] as const)("fails on $name", ({ t, p, r, blockers }) => {
    const result = checkGate(tender(t), profile(p), requirements(r));
    expect(result.eligible).toBe(false);
    expect(result.blockers).toEqual(blockers);
  });

  it.each([
    { name: "a clearance", r: { clearanceRequired: true } },
    { name: "a bond without bonding", r: { bondRequired: true } },
    { name: "a French-only notice", t: { language: "FR" as const } },
  ])("does not gate on $name", ({ t, r }) => {
    expect(checkGate(tender(t), profile(), requirements(r)).eligible).toBe(true);
  });
});

describe("bands", () => {
  it.each([
    [100, "HIGH"],
    [75, "HIGH"],
    [74, "MEDIUM"],
    [50, "MEDIUM"],
    [49, "LOW"],
    [0, "LOW"],
  ])("%i is %s", (total, band) => {
    expect(bandForTotal(total)).toBe(band);
  });
});

describe("scoreTender", () => {
  it("sums the five factors and bands the total", () => {
    const result = scoreTender(tender(), profile(), NOW);
    const { category, location, size, timeline, credentials } = result.factors;
    expect(result.total).toBe(category + location + size + timeline + credentials);
    expect(result.band).toBe(bandForTotal(result.total));
    expect(result.eligible).toBe(true);
    expect(MODEL_VERSION).toBe("rules-1");
  });

  it("keeps the factor points but forces Low when the gate fails", () => {
    const result = scoreTender(tender({ region: "BC" }), profile(), NOW);
    expect(result.eligible).toBe(false);
    expect(result.band).toBe("LOW");
    expect(result.total).toBeGreaterThan(50);
    expect(result.gate.blockers).toEqual([{ code: "regionMismatch", region: "BC" }]);
  });

  it("is deterministic for the same now", () => {
    const t = tender({ closesAt: daysFromNow(4) });
    expect(scoreTender(t, profile(), NOW)).toEqual(scoreTender(t, profile(), NOW));
  });
});
