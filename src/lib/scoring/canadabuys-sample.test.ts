import { describe, expect, it } from "vitest";
import { SAMPLE_PROFILE } from "@/lib/seed/sample-profile";
import {
  BLANKED_CONTACT_COLUMNS,
  SAMPLE_COLUMNS,
  cleanHtml,
  readCanadaBuysSample,
  splitStarred,
  type CanadaBuysSampleRow,
} from "./canadabuys-sample";
import { extractRequirements } from "./requirements";
import { CATEGORY_CAP, categoryMatchPoints, scoreTender } from "./score";

// The extractor and the cap against real CanadaBuys text. The adapter's
// normalization (codes, regions, buyer types) does not exist yet, so the
// scoring here is text-only: codes empty, buyer federal, region CA.

const rows = readCanadaBuysSample();
const byRow = (n: number): CanadaBuysSampleRow => rows[n - 1];
const NOW = new Date("2026-10-24T12:00:00.000Z");

// Rows the readiness review called IT-shaped for the sample profile.
const IT_ROWS = [1, 2, 7, 11, 12, 17];

function textOnlyTender(row: CanadaBuysSampleRow) {
  return {
    title: row.title,
    description: row.description,
    buyerType: "federal",
    categoryCodes: [] as string[],
    region: "CA",
    valueMin: null,
    valueMax: null,
    closesAt: new Date(`${row.closingDate}-04:00`),
    language: "EN" as const,
  };
}

describe("the sample file", () => {
  it("has 20 rows and the 67 original columns", () => {
    expect(rows).toHaveLength(20);
    expect(Object.keys(rows[0].raw)).toHaveLength(67);
    for (const column of Object.values(SAMPLE_COLUMNS)) expect(rows[0].raw).toHaveProperty(column);
  });

  it("keeps the contracting officer's contact columns blank in every row", () => {
    for (const row of rows) {
      for (const column of BLANKED_CONTACT_COLUMNS) {
        expect(row.raw[column], `${row.referenceNumber} ${column}`).toBe("");
      }
    }
  });

  it("has unique reference numbers", () => {
    expect(new Set(rows.map((r) => r.referenceNumber)).size).toBe(20);
  });

  it("carries the shapes the readiness review listed", () => {
    expect(byRow(8).unspsc).toEqual(["22101500", "22101600"]);
    expect(byRow(20).regionsOfDelivery).toHaveLength(14);
    expect(byRow(20).regionsOfDelivery).toContain("Quebec (except NCR)");
    expect(byRow(10).regionsOfDelivery).toEqual(["Ontario (except NCR)"]);
    expect(byRow(19).regionsOfDelivery).toEqual(["Wainwright"]);
    expect(byRow(5).regionsOfOpportunity).toEqual(["World"]);
    expect(byRow(12).noticeType).toBe("Request for Information");
    expect(byRow(13).noticeType).toBe("Advance Contract Award Notice");
    expect(byRow(13).publicationDate).toBe("");
    expect(rows.filter((r) => r.unspsc.length === 0 && r.gsin.length === 0)).toHaveLength(8);
    expect(rows.filter((r) => r.noticeType === "")).toHaveLength(8);
    expect(rows.every((r) => r.status === "Open")).toBe(true);
  });

  it("has closing dates in the past and far in the future while every row says Open", () => {
    const closed = rows.filter((r) => new Date(`${r.closingDate}-04:00`) < NOW).map((r) => r.row);
    expect(closed).toEqual([14, 15, 20]);
    const farFuture = rows.filter((r) => r.closingDate >= "2030").map((r) => r.row);
    expect(farFuture).toEqual([7, 11, 16]);
    for (const row of rows) expect(row.closingDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });
});

describe("cleanHtml and splitStarred", () => {
  it("strips tags and decodes entities", () => {
    expect(cleanHtml("<p>Help&nbsp;desk &amp; network<br/>Data must stay in Canada.</p>")).toBe("Help desk & network\nData must stay in Canada.");
    expect(cleanHtml("Soumissions en fran&ccedil;ais &#8211; 24&#47;7")).toBe("Soumissions en français – 24/7");
  });

  it("leaves no tags or entities in any cleaned description", () => {
    const withHtml = rows.filter((r) => /<[a-z/!][^>]*>|&[a-z#0-9]+;/i.test(r.descriptionRaw));
    expect(withHtml.length).toBeGreaterThanOrEqual(8);
    for (const row of rows) {
      expect(row.description, row.referenceNumber).not.toMatch(/<[a-z/!][^>]*>/i);
      expect(row.description, row.referenceNumber).not.toMatch(/&(?:nbsp|amp|lt|gt|quot|#\d+);/i);
    }
  });

  it("splits starred multi-line cells", () => {
    expect(splitStarred("*22101500\n*22101600")).toEqual(["22101500", "22101600"]);
    expect(splitStarred("")).toEqual([]);
    expect(splitStarred(undefined)).toEqual([]);
  });
});

describe("the extractor on real text", () => {
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
    // Indigenous businesses"; row 20 (hazardous waste) applies the PSAB
    // set-aside to one value band of a standing offer. Both are partial or
    // conditional, and the phase 1 gate cannot tell them from a full
    // set-aside, so it blocks the whole notice for every profile. Recorded
    // in docs/plans/m2-category-cap.md under real data readiness.
    const flagged = rows.filter((row) => extractRequirements(row).setAside != null).map((row) => row.row);
    expect(flagged).toEqual([3, 20]);
    expect(extractRequirements(byRow(3)).setAside).toBe("indigenous businesses");
    expect(extractRequirements(byRow(20)).setAside).toBe("federal government procurement strategy for aboriginal business");
  });
});

describe("the category cap on real rows (text-only scoring, sample IT profile)", () => {
  it("will not cap an IT-shaped row once the adapter maps its codes", () => {
    // Rows with a UNSPSC or GSIN code earn their category points from the
    // code map the M4 adapter must provide; row 17 has no code and must
    // clear the threshold on keywords alone.
    for (const n of IT_ROWS) {
      const row = byRow(n);
      const result = scoreTender(textOnlyTender(row), SAMPLE_PROFILE, NOW);
      const hasCode = row.unspsc.length + row.gsin.length > 0;
      expect(hasCode || categoryMatchPoints(result.details.category) >= CATEGORY_CAP.threshold, `${row.referenceNumber} ${row.title}`).toBe(true);
    }
  });

  it("caps the rows that have no code and no keywords at 49", () => {
    const capped = rows
      .map((row) => ({ row, result: scoreTender(textOnlyTender(row), SAMPLE_PROFILE, NOW) }))
      .filter(({ result }) => result.cap != null);
    expect(capped.length).toBeGreaterThan(0);
    for (const { row, result } of capped) {
      expect(result.total, row.referenceNumber).toBeLessThanOrEqual(49);
      expect(result.band, row.referenceNumber).toBe("LOW");
    }
    // Wharfhead Repairs: nothing IT about it.
    expect(capped.map(({ row }) => row.row)).toContain(5);
  });
});
