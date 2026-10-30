import { describe, expect, it } from "vitest";
import { loadGoldenCases } from "./golden";
import { BUYER_TYPE_LABELS, CATEGORY_LABELS, CERTIFICATION_LABELS, REGION_LABELS, TEAM_SIZE_LABELS } from "./labels";
import { REASON_CODES, buildReasons, referenceCount, renderReason, summarize, type Reason, type ReasonCode, type ReasonParams } from "./reasons";
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
      params: { category: "it-managed-services-cloud" },
      text: "Matches your category: IT managed services and cloud",
    });
    expect(reasons.inFavour[1]).toEqual({ code: "buyerMatch", params: { buyerType: "municipal" }, text: "Municipal buyers are on your list" });
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

  it("writes a three line summary of reason objects, so the list row can be rendered in French too", () => {
    expect(codes(reasons.summary)).toEqual(["categoryMatch", "bondRequired", "buyerMatch"]);
    expect(reasons.summary.map((r) => r.text)).toEqual([
      "Matches your category: IT managed services and cloud",
      "A bond is required and your answers say no bonding",
      "Municipal buyers are on your list",
    ]);
    expect(reasons.summary[0]).toBe(reasons.inFavour[0]);
    for (const line of reasons.summary) expect(line).toEqual({ code: expect.any(String), params: expect.any(Object), text: expect.any(String) });
  });
});

describe("buildReasons templates", () => {
  it("names the province that rules a tender out", () => {
    const reasons = reasonsFor(tender({ region: "QC" }));
    expect(reasons.ruleOut[0]).toEqual({ code: "regionMismatch", params: { region: "QC" }, text: "Outside the provinces you work in: Quebec" });
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

  it("credits a held clearance in your favour instead of ruling you out", () => {
    const reasons = reasonsFor(tender({ description: "Secret clearance required for the project lead." }), profile({ securityClearance: "reliability" }));
    expect(codes(reasons.ruleOut)).not.toContain("clearanceRequired");
    expect(reasons.inFavour).toContainEqual({ code: "clearanceHeld", params: {}, text: "You hold the security clearance this notice asks for" });
  });

  it("flags a missing certification with the alternatives", () => {
    const reasons = reasonsFor(tender({ description: "ISO 27001 or SOC 2 required." }));
    expect(reasons.ruleOut[0]).toEqual({
      code: "certificationMissing",
      params: { certifications: ["SOC 2", "ISO 27001"] },
      text: "Requires SOC 2 or ISO 27001, which you do not list",
    });
    const licence = reasonsFor(tender({ description: "Drawings must be sealed by a licensed professional engineer." }));
    expect(licence.ruleOut[0].text).toBe("Requires a professional engineering licence, which you do not list");
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

  it("calls a close under the lead time tight even when rounding gives full points", () => {
    const reasons = reasonsFor(tender({ closesAt: daysFromNow(19) }), profile({ timelinePref: 20 }));
    expect(reasons.inFavour.map((r) => r.code)).not.toContain("timelineOk");
    expect(reasons.gaps).toContainEqual({ code: "timelineTight", params: { days: 19, lead: 20 }, text: "Closes in 19 days, under your 20 day lead time" });
    const exact = reasonsFor(tender({ closesAt: daysFromNow(20) }), profile({ timelinePref: 20 }));
    expect(exact.inFavour.map((r) => r.code)).toContain("timelineOk");
  });

  it("asks for references without a count when the text gives none", () => {
    const reasons = reasonsFor(tender({ description: "References required." }));
    expect(reasons.gaps.map((r) => r.text)).toContain("References are requested");
  });

  it("stores codes in params and labels only in the English text", () => {
    const reasons = reasonsFor(tender({ description: "SOC 2 required. 24/7 support." }), profile({ capacity: "6-10", certifications: ["SOC 2 Type II"] }));
    expect(reasons.inFavour).toContainEqual({ code: "certificationHeld", params: { certification: "SOC 2" }, text: "You hold SOC 2, which is required" });
    expect(reasons.gaps).toContainEqual({ code: "afterHoursCapacity", params: { band: "6-10" }, text: "24/7 coverage goes beyond a team of 6 to 10" });
    const miss = reasonsFor(tender({ categoryCodes: ["commercial-construction"], buyerType: "federal" }));
    expect(miss.gaps).toContainEqual({ code: "categoryMiss", params: { category: "commercial-construction" }, text: "Outside your categories: Commercial construction" });
    expect(miss.gaps).toContainEqual({ code: "buyerMiss", params: { buyerType: "federal" }, text: "Federal buyers are not on your list" });
  });

  it("never stores an English label in params across the golden set", () => {
    // "SOC 2" is its own label, so only labels that differ from their code count.
    const labels = new Set(
      [CATEGORY_LABELS, BUYER_TYPE_LABELS, REGION_LABELS, TEAM_SIZE_LABELS, CERTIFICATION_LABELS]
        .flatMap((table) => Object.entries(table))
        .filter(([code, label]) => code !== label)
        .map(([, label]) => label),
    );
    for (const c of loadGoldenCases()) {
      const reasons = buildReasons(scoreTender(c.tender, c.profile, c.now), c.tender);
      for (const r of [...reasons.inFavour, ...reasons.gaps, ...reasons.ruleOut]) {
        for (const value of Object.values(r.params)) {
          for (const v of Array.isArray(value) ? value : [value]) expect(labels.has(String(v)), `${c.pair.id} ${r.code} ${v}`).toBe(false);
        }
      }
    }
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
      text: "Too little category match, so this tender is capped at Low",
    });
    expect(reasons.summary[1]).toEqual(reasons.gaps[0]);
  });

  it("does not contradict a partial match: one of three codes matched is still capped", () => {
    const t = tender({ categoryCodes: ["it-managed-services-cloud", "commercial-construction", "facilities-janitorial"], description: "Supply of office chairs." });
    const result = scoreTender(t, profile(), NOW);
    expect(result.details.category.facts.codePoints).toBe(8);
    expect(result.cap).not.toBeNull();
    const reasons = buildReasons(result, t);
    expect(reasons.inFavour[0].code).toBe("categoryMatch");
    expect(reasons.gaps[0].text).toBe("Too little category match, so this tender is capped at Low");
  });

  it("is absent from an uncapped result", () => {
    const reasons = reasonsFor();
    for (const list of [reasons.inFavour, reasons.gaps, reasons.ruleOut]) {
      expect(list.map((r) => r.code)).not.toContain("categoryCap");
    }
  });
});

describe("renderReason: the stored text is a fallback, never an override", () => {
  const stored: Reason = { code: "timelineTight", params: { days: 9, lead: 10 }, text: "Closes in 9 days, under your 10 day lead time" };

  it("renders from the message for the code when one exists", () => {
    const messages = { timelineTight: ({ days, lead }: ReasonParams) => `Ferme dans ${days} jours, sous votre délai de ${lead} jours` };
    expect(renderReason(stored, messages)).toBe("Ferme dans 9 jours, sous votre délai de 10 jours");
  });

  it("falls back to the stored English text only when the code has no message", () => {
    expect(renderReason(stored, {})).toBe(stored.text);
    expect(renderReason(stored, { categoryMatch: () => "unused" })).toBe(stored.text);
  });

  it("only emits codes from REASON_CODES, so messages can cover every one", () => {
    const seen = new Set<string>();
    for (const c of loadGoldenCases()) {
      const reasons = buildReasons(scoreTender(c.tender, c.profile, c.now), c.tender);
      for (const r of [...reasons.inFavour, ...reasons.gaps, ...reasons.ruleOut, ...reasons.summary]) {
        expect(REASON_CODES, r.code).toContain(r.code);
        seen.add(r.code);
      }
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});

describe("referenceCount", () => {
  it.each([
    ["provide three references of similar size", 3],
    ["two client references", 2],
    ["5 references", 5],
    ["references required", null],
    ["quote the 2 reference numbers on the envelope", null],
    ["provide client references. Quote the 2 reference numbers on the envelope.", null],
    ["see the 3 references to the standard", null],
  ])("%j -> %s", (text, expected) => {
    expect(referenceCount(text)).toBe(expected);
  });
});

describe("summarize", () => {
  const r = (code: string): Reason => ({ code: code as ReasonCode, params: {}, text: code });
  const summaryCodes = (...args: Parameters<typeof summarize>) => codes(summarize(...args));

  it("takes favour, concern, favour", () => {
    expect(summaryCodes([r("f1"), r("f2"), r("f3")], [r("g1")], [r("r1")])).toEqual(["f1", "r1", "f2"]);
  });

  it("prefers a blocker over a gap", () => {
    expect(summaryCodes([r("f1")], [r("g1")], [r("r1")])).toEqual(["f1", "r1"]);
  });

  it("pads from the remaining blockers and gaps when nothing is in favour", () => {
    expect(summaryCodes([], [], [r("r1"), r("r2")])).toEqual(["r1", "r2"]);
    expect(summaryCodes([], [r("g1")], [r("r1")])).toEqual(["r1", "g1"]);
    expect(summaryCodes([r("f1")], [], [])).toEqual(["f1"]);
  });

  it("is one line only when the whole result has one reason", () => {
    // No buyer, no lead time, no value range, nothing in the text: the
    // category match is the only reason there is.
    const t = tender({ buyerType: null, valueMin: null, valueMax: null, description: "Managed IT." });
    const p = profile({ sizeMin: null, sizeMax: null, timelinePref: null });
    const reasons = buildReasons(scoreTender(t, p, NOW), t);
    expect([...reasons.inFavour, ...reasons.gaps, ...reasons.ruleOut]).toHaveLength(1);
    expect(codes(reasons.summary)).toEqual(["categoryMatch"]);
  });

  it("falls back to gaps when nothing is in favour", () => {
    expect(summaryCodes([], [r("g1"), r("g2"), r("g3")], [])).toEqual(["g1", "g2", "g3"]);
  });

  it("returns the same objects as the lists, not copies", () => {
    const favour = r("f1");
    expect(summarize([favour], [], [])[0]).toBe(favour);
  });
});
