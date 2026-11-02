import { createFormatter, createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../../messages/en.json";
import { REASON_CODES, type Reason, type ReasonCode } from "@/lib/scoring/reasons";
import { loadGoldenCases } from "@/lib/scoring/golden";
import { buildReasons } from "@/lib/scoring/reasons";
import { scoreTender } from "@/lib/scoring/score";
import { createReasonText } from "./reason-text";

const t = createTranslator({ locale: "en", messages, namespace: "Reasons" });
const tVocab = createTranslator({ locale: "en", messages, namespace: "Vocab" });
const format = createFormatter({ locale: "en" });

const render = createReasonText({
  t: (key, values) => t(key as "categoryMatch", values),
  has: (key) => t.has(key as "categoryMatch"),
  tVocab: (key, values) => tVocab(key as "yes", values),
  hasVocab: (key) => tVocab.has(key as "yes"),
  listOr: (items) => format.list(items, { type: "disjunction" }),
  listAnd: (items) => format.list(items, { type: "conjunction" }),
});

// One sample per code, with the params the engine emits for it.
const SAMPLES: Record<ReasonCode, Reason["params"]> = {
  categoryMatch: { category: "it-managed-services-cloud" },
  categoryMiss: { category: "commercial-construction" },
  categoryUnknown: {},
  categoryCap: { limit: 49 },
  buyerMatch: { buyerType: "municipal" },
  buyerMiss: { buyerType: "federal" },
  regionMismatch: { regions: ["QC", "NB"] },
  setAside: { group: "indigenous businesses" },
  languageMismatch: { language: "FR" },
  bilingualRequired: {},
  bondRequired: {},
  clearanceRequired: {},
  clearanceHeld: {},
  residencyRequired: {},
  valueInRange: {},
  valueAbove: {},
  valueBelow: {},
  valueUnknown: {},
  timelineOk: { days: 12 },
  timelineTight: { days: 1, lead: 10 },
  afterHoursCapacity: { band: "6-10" },
  certificationHeld: { certification: "SOC 2" },
  certificationMissing: { certifications: ["SOC 2", "ISO 27001", "P.Eng."] },
  referencesRequested: {},
};

describe("reason messages", () => {
  it("has a message for every reason code", () => {
    for (const code of REASON_CODES) expect(t.has(code), code).toBe(true);
  });

  it("renders every template with labelled params and nothing left unfilled", () => {
    for (const code of REASON_CODES) {
      const text = render({ code, params: SAMPLES[code], text: "fallback" });
      expect(text, code).not.toBe("fallback");
      expect(text, code).not.toMatch(/[{}]/);
    }
  });

  it("labels codes in the viewer's language", () => {
    expect(render({ code: "categoryMatch", params: { category: "it-managed-services-cloud" }, text: "" })).toBe("Matches your category: IT managed services and cloud");
    expect(render({ code: "buyerMiss", params: { buyerType: "federal" }, text: "" })).toBe("Federal government buyers are not on your list");
    expect(render({ code: "regionMismatch", params: { regions: ["QC"] }, text: "" })).toBe("Outside the provinces you work in: Quebec");
    expect(render({ code: "regionMismatch", params: { regions: ["QC", "NB"] }, text: "" })).toBe("Outside the provinces you work in: Quebec and New Brunswick");
    expect(render({ code: "afterHoursCapacity", params: { band: "6-10" }, text: "" })).toBe("24/7 coverage goes beyond a team of 6 to 10 people");
    expect(render({ code: "certificationMissing", params: { certifications: ["SOC 2", "ISO 27001", "P.Eng."] }, text: "" })).toBe(
      "Requires SOC 2, ISO 27001, or a professional engineering licence (P.Eng.), which you do not list",
    );
    expect(render({ code: "languageMismatch", params: { language: "FR" }, text: "" })).toBe("French-only submission");
    expect(render({ code: "timelineTight", params: { days: 1, lead: 10 }, text: "" })).toBe("Closes in one day, under your 10 day lead time");
    expect(render({ code: "referencesRequested", params: { count: 3 }, text: "" })).toBe("3 references are requested");
    expect(render({ code: "referencesRequested", params: {}, text: "" })).toBe("References are requested");
  });

  it("falls back to the stored text for a code without a message", () => {
    const noMessages = createReasonText({ t: () => "", has: () => false, tVocab: () => "", hasVocab: () => false, listOr: (i) => i.join(" or "), listAnd: (i) => i.join(" and ") });
    expect(noMessages({ code: "valueAbove", params: {}, text: "The value is above your range" })).toBe("The value is above your range");
  });

  it("renders the whole golden set without an unfilled placeholder", () => {
    for (const c of loadGoldenCases()) {
      const reasons = buildReasons(scoreTender(c.tender, c.profile, c.now), c.tender);
      for (const reason of [...reasons.inFavour, ...reasons.gaps, ...reasons.ruleOut]) {
        expect(render(reason), `${c.pair.id} ${reason.code}`).not.toMatch(/[{}]/);
      }
    }
  });
});
