import { describe, expect, it } from "vitest";
import { bandForTotal } from "@/lib/schemas/vocab";
import { checkGate } from "./gate";
import { CATEGORY_CAP, MODEL_VERSION, categoryMatchPoints, scoreTender } from "./score";
import { NOW, daysFromNow, profile, requirements, tender } from "./test-helpers";

describe("checkGate", () => {
  it("passes when the region matches and there is no set-aside", () => {
    expect(checkGate(tender(), profile(), requirements())).toEqual({ eligible: true, blockers: [] });
  });

  it.each([
    { name: "province outside the profile", t: { regions: ["BC"] }, p: {}, r: {}, blockers: [{ code: "regionMismatch", regions: ["BC"] }] },
    { name: "several provinces, none in the profile", t: { regions: ["BC", "AB"] }, p: {}, r: {}, blockers: [{ code: "regionMismatch", regions: ["BC", "AB"] }] },
    { name: "set-aside for a group", t: {}, p: {}, r: { setAside: "indigenous businesses" }, blockers: [{ code: "setAside", group: "indigenous businesses" }] },
    {
      name: "both at once",
      t: { regions: ["QC"] },
      p: {},
      r: { setAside: "small businesses" },
      blockers: [
        { code: "regionMismatch", regions: ["QC"] },
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
    expect(result.cap).toBeNull();
    expect(MODEL_VERSION).toBe("rules-3");
  });

  it("scores the sample shape at 92 with 38, 19, 14, 12 and 9 and no cap", () => {
    // Mirrors the golden sample pair with the test helpers, so the cap test
    // file carries the number the product promises.
    const t = tender({
      description:
        "Help desk, network and cloud managed services for 900 staff, 24 hours a day. Data must stay in Canada. SOC 2 Type II or ISO 27001 required, three references, and a performance bond.",
      valueMin: 1_000_000,
      valueMax: 1_400_000,
      closesAt: daysFromNow(9),
    });
    const p = profile({
      capacity: "6-10",
      categories: ["it-managed-services-cloud", "cybersecurity-data-protection", "custom-software-saas"],
      buyerTypes: ["municipal", "provincial", "health-authority", "crown-utility"],
      sizeMin: 250_000,
      sizeMax: 3_000_000,
      certifications: ["SOC 2 Type II"],
    });
    const result = scoreTender(t, p, NOW);
    expect(result.factors).toEqual({ category: 38, location: 19, size: 14, timeline: 12, credentials: 9 });
    expect(result.total).toBe(92);
    expect(result.cap).toBeNull();
  });

  it("keeps the factor points but forces Low when the gate fails", () => {
    const result = scoreTender(tender({ regions: ["BC"] }), profile(), NOW);
    expect(result.eligible).toBe(false);
    expect(result.band).toBe("LOW");
    expect(result.total).toBeGreaterThan(50);
    expect(result.gate.blockers).toEqual([{ code: "regionMismatch", regions: ["BC"] }]);
  });

  describe("category cap", () => {
    // No code match, buyer not on the list, no keywords: category 0.
    const offCategory = { categoryCodes: ["commercial-construction"], buyerType: "federal", description: "Supply of office chairs." } as const;

    it("caps a strong total at exactly 49 and bands it Low when category is 0", () => {
      const result = scoreTender(tender(offCategory), profile(), NOW);
      expect(result.factors.category).toBe(0);
      expect(result.factors).toMatchObject({ location: 20, size: 14, timeline: 15, credentials: 10 });
      expect(result.total).toBe(CATEGORY_CAP.limit);
      expect(result.total).toBe(49);
      expect(result.band).toBe("LOW");
      expect(result.eligible).toBe(true);
      expect(result.cap).toEqual({ code: "categoryCap", threshold: 10, matchPoints: 0, limit: 49, uncappedTotal: 59 });
    });

    it("leaves a total already under 49 unchanged but still records the cap", () => {
      const result = scoreTender(
        tender({ ...offCategory, language: "FR", valueMin: null, valueMax: null, closesAt: daysFromNow(1) }),
        profile(),
        NOW,
      );
      // 0 + location 15 (French-only) + size 7 (no value) + timeline 6 (1 of 10 days) + credentials 10
      expect(result.factors.category).toBe(0);
      expect(result.total).toBe(38);
      expect(result.cap?.uncappedTotal).toBe(38);
      expect(result.band).toBe("LOW");
    });

    // The threshold reads code plus keyword points. Buyer points never count:
    // a municipal janitorial tender must not reach Medium for a municipal IT
    // firm because the buyer is right and "service" is in the text.
    it.each([
      { name: "buyer match alone (8, match 0)", t: { categoryCodes: ["commercial-construction"], description: "Supply of office chairs." }, category: 8, match: 0, capped: true },
      { name: "unknown buyer plus three keywords (9, match 5)", t: { categoryCodes: ["commercial-construction"], buyerType: null, description: "Help desk, network and cloud." }, category: 9, match: 5, capped: true },
      { name: "buyer match plus one keyword (10, match 2)", t: { categoryCodes: ["commercial-construction"], description: "Cloud hosting." }, category: 10, match: 2, capped: true },
      { name: "buyer match plus four keywords (14, match 6)", t: { categoryCodes: ["commercial-construction"], description: "Help desk, network, cloud and data centre." }, category: 14, match: 6, capped: true },
      { name: "wrong buyer, no code, all five keywords (32, match 32)", t: { categoryCodes: [], buyerType: "federal", description: "Managed services: help desk, network, cloud and data centre." }, category: 32, match: 32, capped: false },
      { name: "one matched code with nothing else (24)", t: { buyerType: "federal", description: "Supply of office chairs." }, category: 24, match: 24, capped: false },
    ] as const)("$name", ({ t, category, match, capped }) => {
      const result = scoreTender(tender(t), profile(), NOW);
      expect(result.factors.category).toBe(category);
      expect(categoryMatchPoints(result.details.category)).toBe(match);
      expect(Boolean(result.cap)).toBe(capped);
      if (capped) expect(result.cap?.matchPoints).toBe(match);
      if (!capped) expect(result.total).toBe(Object.values(result.factors).reduce((a, b) => a + b, 0));
    });

    it("caps a right buyer with one generic keyword: the escape the review found", () => {
      // Municipal medical-equipment profile meets a municipal janitorial
      // tender whose text says "service".
      const t = tender({
        categoryCodes: ["facilities-janitorial"],
        buyerType: "municipal",
        description: "Janitorial service for three arenas. Supplier to post a performance bond.",
      });
      const p = profile({ categories: ["medical-equipment-pharma"], buyerTypes: ["municipal"], bonding: true });
      const result = scoreTender(t, p, NOW);
      expect(result.details.category.facts.buyerPoints).toBe(8);
      expect(result.cap).not.toBeNull();
      expect(result.total).toBeLessThanOrEqual(49);
      expect(result.band).toBe("LOW");
    });

    it("keeps the gate separate: a capped and gated tender is ineligible with a capped total", () => {
      const result = scoreTender(tender({ ...offCategory, regions: ["BC"] }), profile(), NOW);
      expect(result.eligible).toBe(false);
      expect(result.cap).not.toBeNull();
      expect(result.total).toBeLessThanOrEqual(49);
    });
  });

  it("is deterministic for the same now", () => {
    const t = tender({ closesAt: daysFromNow(4) });
    expect(scoreTender(t, profile(), NOW)).toEqual(scoreTender(t, profile(), NOW));
  });
});
