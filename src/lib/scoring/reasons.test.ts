import { describe, expect, it } from "vitest";
import { loadGoldenCases } from "./golden";
import { buildReasons, referenceCount, summarize, type Reason } from "./reasons";
import { scoreTender } from "./score";
import { NOW, daysFromNow, profile, tender } from "./test-helpers";

function reasonsFor(t = tender(), p = profile(), now = NOW) {
  return buildReasons(scoreTender(t, p, now), t);
}

function codes(list: Reason[]) {
  return list.map((r) => r.code);
}

describe("buildReasons on the sample pair", () => {
  const sample = loadGoldenCases().find((c) => c.pair.id === "sample-it-managed-services")!;
  const reasons = buildReasons(scoreTender(sample.tender, sample.profile, sample.now), sample.tender);

  it("puts the category and buyer first in your favour", () => {
    expect(reasons.inFavour[0]).toEqual({
      code: "categoryMatch",
      params: { category: "IT managed services and cloud" },
      text: "Matches your category: IT managed services and cloud",
    });
    expect(reasons.inFavour[1].text).toBe("Municipal buyers are on your list");
    expect(codes(reasons.inFavour)).toEqual(["categoryMatch", "buyerMatch", "valueInRange", "certificationHeld"]);
  });

  it("lists 24/7 coverage, the tight close and the references as gaps", () => {
    expect(codes(reasons.gaps)).toEqual(["timelineTight", "afterHoursCapacity", "referencesRequested"]);
    expect(reasons.gaps.map((r) => r.text)).toEqual([
      "Closes in 9 days, under your 10 day lead time",
      "24/7 coverage goes beyond a team of 6 to 10",
      "3 references are requested",
    ]);
  });

  it("flags the bond as something that could rule you out", () => {
    expect(reasons.ruleOut).toEqual([
      { code: "bondRequired", params: {}, text: "A bond is required and your answers say no bonding" },
    ]);
  });

  it("writes a three line summary", () => {
    expect(reasons.summary).toEqual([
      "Matches your category: IT managed services and cloud",
      "A bond is required and your answers say no bonding",
      "Municipal buyers are on your list",
    ]);
  });
});

describe("buildReasons templates", () => {
  it("names the province that rules a tender out", () => {
    const reasons = reasonsFor(tender({ region: "QC" }));
    expect(reasons.ruleOut[0]).toEqual({ code: "regionMismatch", params: { region: "Quebec" }, text: "Outside the provinces you work in: Quebec" });
  });

  it("names the set-aside group", () => {
    const reasons = reasonsFor(tender({ description: "This contract is set aside for Indigenous businesses." }));
    expect(reasons.ruleOut.map((r) => r.text)).toContain("Set aside for indigenous businesses");
  });

  it("flags a French-only notice and a clearance", () => {
    const reasons = reasonsFor(tender({ language: "FR", description: "Habilitation de sécurité requise." }));
    expect(codes(reasons.ruleOut)).toEqual(["languageMismatch", "clearanceRequired"]);
    expect(reasons.ruleOut[0].text).toBe("French-only submission");
  });

  it("flags a missing certification with the alternatives", () => {
    const reasons = reasonsFor(tender({ description: "ISO 27001 or SOC 2 required." }));
    expect(reasons.ruleOut[0].text).toBe("Requires SOC 2 or ISO 27001, which you do not list");
  });

  it("says when the category is outside the profile and the buyer is not on the list", () => {
    const reasons = reasonsFor(tender({ categoryCodes: ["commercial-construction"], buyerType: "federal" }));
    expect(reasons.gaps.map((r) => r.text)).toEqual(
      expect.arrayContaining(["Outside your categories: Commercial construction", "Federal buyers are not on your list"]),
    );
    expect(reasons.inFavour.map((r) => r.code)).not.toContain("categoryMatch");
  });

  it("describes the value position", () => {
    expect(reasonsFor(tender({ valueMin: 9_000_000, valueMax: 9_500_000 })).gaps.map((r) => r.text)).toContain("The value is above your range");
    expect(reasonsFor(tender({ valueMin: 1_000, valueMax: 2_000 })).gaps.map((r) => r.text)).toContain("The value is below your range");
    expect(reasonsFor(tender({ valueMin: null, valueMax: null })).gaps.map((r) => r.text)).toContain("No value is published");
  });

  it("praises a comfortable closing date and bilingual gaps", () => {
    const reasons = reasonsFor(tender({ closesAt: daysFromNow(30), language: "EN_FR" }));
    expect(reasons.inFavour.map((r) => r.text)).toContain("Closes in 30 days, inside your lead time");
    expect(reasons.gaps.map((r) => r.text)).toContain("Bilingual delivery is required");
  });

  it("asks for references without a count when the text gives none", () => {
    const reasons = reasonsFor(tender({ description: "References required." }));
    expect(reasons.gaps.map((r) => r.text)).toContain("References are requested");
  });

  it("always has two or three summary lines across the golden set", () => {
    for (const c of loadGoldenCases()) {
      const summary = buildReasons(scoreTender(c.tender, c.profile, c.now), c.tender).summary;
      expect(summary.length, c.pair.id).toBeGreaterThanOrEqual(2);
      expect(summary.length, c.pair.id).toBeLessThanOrEqual(3);
    }
  });

  it("never uses an em dash", () => {
    for (const c of loadGoldenCases()) {
      const reasons = buildReasons(scoreTender(c.tender, c.profile, c.now), c.tender);
      for (const r of [...reasons.inFavour, ...reasons.gaps, ...reasons.ruleOut]) {
        expect(r.text).not.toMatch(/—/);
      }
    }
  });
});

describe("category cap reason", () => {
  it("leads the gaps and the summary's concern line on a capped result", () => {
    const t = tender({ categoryCodes: ["commercial-construction"], buyerType: "federal", description: "Supply of office chairs." });
    const result = scoreTender(t, profile(), NOW);
    expect(result.cap).not.toBeNull();
    const reasons = buildReasons(result, t);
    expect(reasons.gaps[0]).toEqual({
      code: "categoryCap",
      params: { limit: 49 },
      text: "No category match, so this tender is capped at Low",
    });
    expect(reasons.summary[1]).toBe("No category match, so this tender is capped at Low");
  });

  it("is absent from an uncapped result", () => {
    const reasons = reasonsFor();
    for (const list of [reasons.inFavour, reasons.gaps, reasons.ruleOut]) {
      expect(list.map((r) => r.code)).not.toContain("categoryCap");
    }
  });
});

describe("referenceCount", () => {
  it.each([
    ["provide three references of similar size", 3],
    ["two client references", 2],
    ["5 references", 5],
    ["references required", null],
  ])("%j -> %s", (text, expected) => {
    expect(referenceCount(text)).toBe(expected);
  });
});

describe("summarize", () => {
  const r = (code: string): Reason => ({ code, params: {}, text: code });

  it("takes favour, concern, favour", () => {
    expect(summarize([r("f1"), r("f2"), r("f3")], [r("g1")], [r("r1")])).toEqual(["f1", "r1", "f2"]);
  });

  it("prefers a blocker over a gap", () => {
    expect(summarize([r("f1")], [r("g1")], [r("r1")])).toEqual(["f1", "r1"]);
  });

  it("falls back to gaps when nothing is in favour", () => {
    expect(summarize([], [r("g1"), r("g2"), r("g3")], [])).toEqual(["g1", "g2", "g3"]);
  });
});
