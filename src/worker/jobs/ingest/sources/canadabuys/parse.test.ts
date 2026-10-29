import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import { IngestError } from "../../errors";
import { COLUMNS, CONTACT_COLUMNS } from "./columns";
import { checkHeader, parseCanadaBuys, parseClosing, parseDay } from "./parse";

// The parser on fixtures/canadabuys-sample-20.csv, the trimmed copy of the
// real open tender notices file (contact columns blanked on purpose). Row
// numbers below are the file's data rows, 1 to 20.

import { SAMPLE_PATH } from "./sample";

const BODY = readFileSync(SAMPLE_PATH);
const NOW = new Date("2026-10-24T12:00:00.000Z");

const result = parseCanadaBuys(BODY, { now: NOW, rawFileKey: "canadabuys/2026/10/24/open-120000Z.csv", existing: new Map() });
const byRow = (n: number) => result.tenders[n - 1];

describe("the sample file", () => {
  const raw = parse(BODY, { columns: true, bom: true }) as Record<string, string>[];

  it("has 20 rows, the 67 original columns and every column the adapter reads", () => {
    expect(raw).toHaveLength(20);
    expect(Object.keys(raw[0])).toHaveLength(67);
    for (const label of Object.values(COLUMNS)) expect(raw[0]).toHaveProperty(label);
  });

  it("keeps the contracting officer's contact columns blank in every row", () => {
    for (const row of raw) for (const column of CONTACT_COLUMNS) expect(row[column], column).toBe("");
  });
});

describe("parseCanadaBuys on the sample", () => {
  it("reads every row, skips none and keeps the file order", () => {
    expect(result.rowsFound).toBe(20);
    expect(result.tenders).toHaveLength(20);
    expect(result.skipped).toEqual([]);
    expect(result.tenders.map((t) => t.externalId).slice(0, 3)).toEqual(["cb-329-8183335", "cb-383-49070000", "MX-443841357513"]);
    expect(new Set(result.tenders.map((t) => t.externalId)).size).toBe(20);
  });

  it("fills the shared shape: English text, EN, no value, the raw file key, the solicitation number", () => {
    const t = byRow(1);
    expect(t).toMatchObject({
      externalId: "cb-329-8183335",
      solicitationNumber: "5000096222",
      title: "5000096222 Technology Architect (Level 3)",
      buyer: "Canadian Nuclear Safety Commission (CNSC)",
      buyerType: "federal",
      language: "EN",
      valueMin: null,
      valueMax: null,
      rawFileKey: "canadabuys/2026/10/24/open-120000Z.csv",
      officialUrl: null,
    });
    expect(t.description.length).toBeGreaterThan(1000);
  });

  it("marks the notice kinds: bids, the RFI, the ACAN and the untyped MERX rows", () => {
    expect(byRow(12)).toMatchObject({ noticeType: "Request for Information", noticeKind: "RFI" });
    expect(byRow(13)).toMatchObject({ noticeType: "Advance Contract Award Notice", noticeKind: "ACAN" });
    expect(byRow(5)).toMatchObject({ noticeType: "Request for Proposal", noticeKind: "BID" });
    expect(byRow(1)).toMatchObject({ noticeType: "RFP against Supply Arrangement", noticeKind: "BID" });
    const untyped = result.tenders.filter((t) => t.noticeType === null);
    expect(untyped).toHaveLength(8);
    expect(untyped.every((t) => t.noticeKind === "UNKNOWN")).toBe(true);
  });

  it("parses closing dates as Eastern Standard Time, UTC-5", () => {
    expect(byRow(1).closesAt.toISOString()).toBe("2026-10-26T19:00:00.000Z"); // 14:00 in the file
    expect(byRow(2).closesAt.toISOString()).toBe("2026-10-27T04:59:00.000Z"); // 23:59 crosses midnight UTC
    const closed = result.tenders.filter((t) => t.closesAt <= NOW).map((t) => result.tenders.indexOf(t) + 1);
    expect(closed).toEqual([14, 15, 20]);
    const farFuture = result.tenders.filter((t) => t.closesAt.getUTCFullYear() >= 2030).map((t) => result.tenders.indexOf(t) + 1);
    expect(farFuture).toEqual([7, 11, 16]);
  });

  it("takes the publication date, then the amendment date, then the stored row, then the run date", () => {
    expect(byRow(1).publishedAt.toISOString()).toBe("2026-10-06T00:00:00.000Z");
    // Row 13 (ACAN) has no publication date and no amendment date.
    expect(byRow(13).publishedAt).toEqual(NOW);
    const existing = new Map([["SSC-26-00035176:T", { publishedAt: new Date("2026-10-01T00:00:00.000Z") }]]);
    const again = parseCanadaBuys(BODY, { now: NOW, rawFileKey: "k", existing });
    expect(again.tenders[12].publishedAt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("maps regions: NCR to Ontario and Quebec, cities to provinces, World plus a province to the province", () => {
    expect(byRow(1).regions).toEqual(["ON", "QC"]); // National Capital Region (NCR)
    expect(byRow(5).regions).toEqual(["BC"]); // delivery British Columbia, opportunity World
    expect(byRow(10).regions).toEqual(["ON"]); // Ontario (except NCR)
    expect(byRow(19).regions).toEqual(["AB"]); // Wainwright
    expect(byRow(8).regions).toEqual(["MB"]);
    expect(byRow(20).regions).toEqual(["NT", "NS", "NB", "NU", "NL", "YT", "BC", "QC", "SK", "MB", "PE", "ON", "AB"]); // 14 values, 13 codes
    expect(byRow(4).regions).toEqual(["CA"]); // Canada
    expect(byRow(3).regions).toEqual(["CA"]); // no region at all
    expect(result.unmapped.regions).toEqual({});
  });

  it("maps the buyers to their type and never leaves it null", () => {
    expect(byRow(2).buyerType).toBe("defence-public-safety"); // DND
    expect(byRow(3).buyerType).toBe("defence-public-safety"); // Defence Construction Canada
    expect(byRow(9).buyerType).toBe("crown-utility"); // BDC
    expect(byRow(16).buyerType).toBe("crown-utility"); // Canada Post
    expect(byRow(7).buyerType).toBe("federal"); // Shared Services Canada
    expect(result.tenders.every((t) => t.buyerType != null)).toBe(true);
    expect(result.unmapped.buyers).toEqual({});
  });

  it("maps the UNSPSC and GSIN codes it knows and reports the rest", () => {
    expect(byRow(1).categoryCodes).toEqual(["custom-software-saas"]); // 81111500 Software or hardware engineering
    expect(byRow(2).categoryCodes).toEqual(["it-managed-services-cloud"]); // 43211608
    expect(byRow(7).categoryCodes).toEqual(["it-managed-services-cloud"]); // D304A Data transmission
    expect(byRow(12).categoryCodes).toEqual(["custom-software-saas"]); // N7030 ADP software
    expect(byRow(20).categoryCodes).toEqual(["facilities-janitorial"]); // E108CA hazardous waste disposal
    expect(byRow(8).categoryCodes).toEqual([]); // two heavy equipment codes, none of ours
    expect(result.tenders.filter((t) => t.categoryCodes.length === 0)).toHaveLength(13);
    expect(result.unmapped.categories).toEqual({ "11162100": 1, "22000000": 1, "22101500": 1, "22101600": 1, "24101800": 1, "30171500": 1 });
    expect(result.unmapped.noticeTypes).toEqual({});
  });

  it("builds the notice page link from the reference number for every row", () => {
    expect(byRow(7).noticePageUrl).toBe("https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/ssc-26-00034400t");
    expect(byRow(20).noticePageUrl).toBe("https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/pw-ncs-030-11940");
    expect(byRow(10).noticePageUrl).toBe("https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/ws4052927717-doc4053526199");
    expect(result.tenders.every((t) => t.noticePageUrl?.startsWith("https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/"))).toBe(true);
  });

  it("keeps the notice link where there is one and leaves null otherwise", () => {
    expect(byRow(3).officialUrl).toBe("https://www.merx.com/public/solicitations/3776296409/abstract?language=EN");
    expect(byRow(10).officialUrl).toMatch(/^https:\/\/portal\.us\.bn\.cloud\.ariba\.com\//);
    expect(result.tenders.filter((t) => t.officialUrl === null)).toHaveLength(11);
  });

  it("leaves no tags or entities in any description", () => {
    for (const t of result.tenders) {
      expect(t.description, t.externalId).not.toMatch(/<[a-z/!][^>]*>/i);
      expect(t.description, t.externalId).not.toMatch(/&(?:nbsp|amp|lt|gt|quot|#\d+);/i);
    }
    expect(byRow(6).description).toMatch(/janitorial/i);
  });
});

describe("parseCanadaBuys on edited rows", () => {
  const [header, row] = parse(BODY, { bom: true }) as string[][];
  const col = (label: string) => header.indexOf(label);

  function fileWith(edits: Record<string, string>): Buffer {
    const copy = [...row];
    for (const [label, value] of Object.entries(edits)) copy[col(label)] = value;
    const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
    return Buffer.from(`${header.map(quote).join(",")}\n${copy.map(quote).join(",")}\n`, "utf8");
  }

  const ctx = { now: NOW, rawFileKey: "k", existing: new Map() };

  it("skips a row without a reference number", () => {
    const r = parseCanadaBuys(fileWith({ [COLUMNS.referenceNumber]: "  " }), ctx);
    expect(r.tenders).toEqual([]);
    expect(r.skipped).toEqual([{ row: 1, externalId: null, reason: "missingReference", detail: expect.stringContaining("Technology Architect") }]);
  });

  it("skips a row without a title, and takes the French title when English is blank", () => {
    expect(parseCanadaBuys(fileWith({ [COLUMNS.titleEn]: "", [COLUMNS.titleFr]: "" }), ctx).skipped).toEqual([{ row: 1, externalId: "cb-329-8183335", reason: "missingTitle", detail: "" }]);
    expect(parseCanadaBuys(fileWith({ [COLUMNS.titleEn]: "", [COLUMNS.titleFr]: "Architecte technologique" }), ctx).tenders[0].title).toBe("Architecte technologique");
  });

  it("skips a row with an unreadable closing date", () => {
    const r = parseCanadaBuys(fileWith({ [COLUMNS.closingDate]: "2026-13-45" }), ctx);
    expect(r.skipped).toEqual([{ row: 1, externalId: "cb-329-8183335", reason: "invalidClosingDate", detail: "2026-13-45" }]);
  });

  it("skips a row that closes before it was published", () => {
    const r = parseCanadaBuys(fileWith({ [COLUMNS.publicationDate]: "2026-10-27" }), ctx);
    expect(r.skipped).toEqual([{ row: 1, externalId: "cb-329-8183335", reason: "closesBeforePublished", detail: "closesAt: closesBeforePublished" }]);
  });

  it("falls back to the French description, then the title, and drops a bad link", () => {
    const fr = parseCanadaBuys(fileWith({ [COLUMNS.descriptionEn]: "", [COLUMNS.descriptionFr]: "<p>Services d&#39;architecte</p>" }), ctx).tenders[0];
    expect(fr.description).toBe("Services d'architecte");
    const none = parseCanadaBuys(fileWith({ [COLUMNS.descriptionEn]: "", [COLUMNS.descriptionFr]: "" }), ctx).tenders[0];
    expect(none.description).toBe(none.title);
    expect(parseCanadaBuys(fileWith({ [COLUMNS.noticeUrl]: "merx.com/notice" }), ctx).tenders[0].officialUrl).toBeNull();
    expect(parseCanadaBuys(fileWith({ [COLUMNS.noticeUrl]: "javascript:alert(1)" }), ctx).tenders[0].officialUrl).toBeNull();
  });

  it("cuts a long title at 500 characters and reports a new notice type", () => {
    const r = parseCanadaBuys(fileWith({ [COLUMNS.titleEn]: "x".repeat(600), [COLUMNS.noticeType]: "Request for Expressions of Interest" }), ctx);
    expect(r.tenders[0].title).toHaveLength(500);
    expect(r.tenders[0]).toMatchObject({ noticeType: "Request for Expressions of Interest", noticeKind: "OTHER" });
    expect(r.unmapped.noticeTypes).toEqual({ "Request for Expressions of Interest": 1 });
  });

  it("fails the run when an expected column is missing from the header", () => {
    const renamed = header.map((h) => (h === COLUMNS.closingDate ? "closingDate" : h));
    const body = Buffer.from(`${renamed.join(",")}\n${row.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")}\n`, "utf8");
    const error = (() => {
      try {
        parseCanadaBuys(body, ctx);
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(IngestError);
    expect((error as IngestError).code).toBe("parse");
    expect((error as IngestError).message).toContain("tenderClosingDate-appelOffresDateCloture");
    expect(() => checkHeader(header)).not.toThrow();
  });

  it("reads an empty file as zero rows", () => {
    expect(parseCanadaBuys(Buffer.from(`${header.join(",")}\n`), ctx)).toMatchObject({ rowsFound: 0, tenders: [], skipped: [] });
  });
});

describe("date helpers", () => {
  it("parseClosing accepts the file's shape only", () => {
    expect(parseClosing("2026-11-13T14:00:00")?.toISOString()).toBe("2026-11-13T19:00:00.000Z");
    expect(parseClosing("2026-11-13")).toBeNull();
    expect(parseClosing("2026-11-13T14:00:00Z")).toBeNull();
    expect(parseClosing("")).toBeNull();
  });

  it("parseDay reads a calendar day as midnight UTC", () => {
    expect(parseDay("2026-10-06")?.toISOString()).toBe("2026-10-06T00:00:00.000Z");
    expect(parseDay("")).toBeNull();
    expect(parseDay("2026-10-06T00:00:00")).toBeNull();
  });
});
