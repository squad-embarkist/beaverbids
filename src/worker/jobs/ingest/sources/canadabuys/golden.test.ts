import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractRequirements } from "@/lib/scoring/requirements";
import { CATEGORY_CAP, categoryMatchPoints, scoreTender } from "@/lib/scoring/score";
import { SAMPLE_PROFILE } from "@/lib/seed/sample-profile";
import { parseCanadaBuys } from "./parse";
import { SAMPLE_PATH } from "./sample";

// The CanadaBuys golden batch: the 20 sample notices through the adapter,
// then scored for the sample company profile (Ontario IT firm). Pins
// eligibility, band and the cap per row, like fixtures/golden.json does for
// the fictional tenders. A row that moves needs a note in the pull request.
// `now` is the day the sample was taken, so the timeline factor is stable.

const NOW = new Date("2026-10-24T12:00:00.000Z");
const { tenders } = parseCanadaBuys(readFileSync(SAMPLE_PATH), { now: NOW, rawFileKey: "k", existing: new Map() });
const byRow = (n: number) => tenders[n - 1];

type Expected = { row: number; id: string; kind: string; eligible: boolean; band: "HIGH" | "MEDIUM" | "LOW"; capped: boolean; note: string };

const GOLDEN: Expected[] = [
  { row: 1, id: "cb-329-8183335", kind: "BID", eligible: true, band: "MEDIUM", capped: false, note: "Technology architect, NCR, software engineering code" },
  { row: 2, id: "cb-383-49070000", kind: "BID", eligible: true, band: "MEDIUM", capped: false, note: "Video encoders for DND, national, IT equipment code" },
  { row: 3, id: "MX-443841357513", kind: "UNKNOWN", eligible: false, band: "LOW", capped: true, note: "Construction source list, conditional Indigenous set-aside gates it" },
  { row: 4, id: "cb-395-95380568", kind: "BID", eligible: true, band: "LOW", capped: true, note: "Coated cloth for DND, nothing IT" },
  { row: 5, id: "cb-212-11044757", kind: "BID", eligible: false, band: "LOW", capped: true, note: "Wharfhead repairs in BC, outside Ontario" },
  { row: 6, id: "MX-444171758619", kind: "UNKNOWN", eligible: true, band: "LOW", capped: true, note: "Janitorial services, no code, no IT keywords" },
  { row: 7, id: "SSC-26-00034400:T", kind: "BID", eligible: true, band: "HIGH", capped: false, note: "Local internet access supply arrangement, D304A, ongoing" },
  { row: 8, id: "cb-10-19497485", kind: "BID", eligible: false, band: "LOW", capped: true, note: "Compact tracked loader in Manitoba" },
  { row: 9, id: "MX-243100575639", kind: "UNKNOWN", eligible: true, band: "LOW", capped: true, note: "Media monitoring for BDC" },
  { row: 10, id: "WS4052927717-Doc4053526199", kind: "BID", eligible: true, band: "LOW", capped: true, note: "Construction equipment rental, Ontario, unmapped code" },
  { row: 11, id: "SSC-22-00020507:T", kind: "BID", eligible: true, band: "HIGH", capped: false, note: "Local internet access RFSA, D304A, ongoing" },
  { row: 12, id: "SSC-26-00035036:T", kind: "RFI", eligible: true, band: "HIGH", capped: false, note: "Desktop virtualization RFI, N7030; scored here, hidden from the list" },
  { row: 13, id: "SSC-26-00035176:T", kind: "ACAN", eligible: true, band: "HIGH", capped: false, note: "Satellite services ACAN, D399BB; scored here, hidden from the list" },
  { row: 14, id: "MX-443728062417", kind: "UNKNOWN", eligible: true, band: "LOW", capped: true, note: "UX research for EDC, closed" },
  { row: 15, id: "MX-443973887373", kind: "UNKNOWN", eligible: true, band: "LOW", capped: true, note: "Translation services for EDC, closed" },
  { row: 16, id: "MX-443334830711", kind: "UNKNOWN", eligible: true, band: "LOW", capped: true, note: "Mechanical services supply arrangement for Canada Post" },
  { row: 17, id: "MX-444188030829", kind: "UNKNOWN", eligible: true, band: "HIGH", capped: false, note: "Managed services for BDC, no code, clears the cap on keywords alone" },
  { row: 18, id: "MX-444158422563", kind: "UNKNOWN", eligible: true, band: "LOW", capped: true, note: "Facilities maintenance for DCC, 'Buildings' is not a software keyword" },
  { row: 19, id: "cb-922-97825427", kind: "BID", eligible: false, band: "LOW", capped: true, note: "Metal doors in Wainwright, Alberta" },
  { row: 20, id: "PW-_NCS-030-11940", kind: "BID", eligible: false, band: "LOW", capped: true, note: "Hazardous waste disposal, PSAB set-aside on one band gates it, closed" },
];

describe("the CanadaBuys golden batch (sample profile)", () => {
  it("has one entry per sample row", () => {
    expect(GOLDEN.map((g) => g.id)).toEqual(tenders.map((t) => t.externalId));
  });

  it.each(GOLDEN)("row $row $id: $note", (expected) => {
    const tender = byRow(expected.row);
    const result = scoreTender(tender, SAMPLE_PROFILE, NOW);
    expect({ kind: tender.noticeKind, eligible: result.eligible, band: result.band, capped: result.cap != null }).toEqual({
      kind: expected.kind,
      eligible: expected.eligible,
      band: expected.band,
      capped: expected.capped,
    });
    if (expected.capped) expect(result.total).toBeLessThanOrEqual(CATEGORY_CAP.limit);
  });

  it("gives every coded IT row its category points from the code map, and row 17 from keywords", () => {
    for (const n of [1, 2, 7, 11, 12, 13]) {
      expect(byRow(n).categoryCodes.length, `row ${n}`).toBeGreaterThan(0);
      expect(categoryMatchPoints(scoreTender(byRow(n), SAMPLE_PROFILE, NOW).details.category), `row ${n}`).toBeGreaterThanOrEqual(CATEGORY_CAP.threshold);
    }
    expect(byRow(17).categoryCodes).toEqual([]);
    expect(categoryMatchPoints(scoreTender(byRow(17), SAMPLE_PROFILE, NOW).details.category)).toBeGreaterThanOrEqual(CATEGORY_CAP.threshold);
  });
});

describe("the extractor on the adapter's text", () => {
  it("finds category keywords in the IT-shaped rows", () => {
    expect(extractRequirements(byRow(13)).keywordHits["it-managed-services-cloud"]).toContain("managed services");
    expect(extractRequirements(byRow(17)).keywordHits["custom-software-saas"]).toEqual(expect.arrayContaining(["application", "integration"]));
  });

  it("finds the right category for non-IT rows", () => {
    expect(extractRequirements(byRow(6)).keywordHits["facilities-janitorial"]).toContain("janitorial");
    expect(extractRequirements(byRow(20)).keywordHits["logistics-freight-3pl"]).toContain("hazardous");
  });

  it("does not take 'Buildings' or 'capital' as software keywords", () => {
    const hits = extractRequirements(byRow(18)).keywordHits["custom-software-saas"] ?? [];
    expect(hits).not.toContain("build");
    expect(hits).not.toContain("api");
  });

  it("reports the two conditional set-asides in the sample and no other", () => {
    // Row 3 (CFB Halifax source list) says tenders "may be set aside for
    // Indigenous businesses"; row 20 applies the PSAB set-aside to one value
    // band of a standing offer. The phase 1 gate cannot tell a partial
    // set-aside from a full one, so it blocks both for every profile
    // (docs/plans/m2-category-cap.md, real data readiness).
    const flagged = tenders.filter((t) => extractRequirements(t).setAside != null).map((t) => tenders.indexOf(t) + 1);
    expect(flagged).toEqual([3, 20]);
    expect(extractRequirements(byRow(3)).setAside).toBe("indigenous businesses");
    expect(extractRequirements(byRow(20)).setAside).toBe("federal government procurement strategy for aboriginal business");
  });
});
