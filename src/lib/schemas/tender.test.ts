import { describe, expect, it } from "vitest";
import { tenderInputSchema } from "./tender";

const valid = {
  externalId: "FIXTURE-9999",
  title: "Test tender",
  buyer: "Sample Town",
  buyerType: "municipal",
  description: "A tender used in tests.",
  categoryCodes: ["facilities-janitorial"],
  regions: ["ON"],
  valueMin: 100_000,
  valueMax: 200_000,
  publishedAt: "2026-10-01T00:00:00.000Z",
  closesAt: "2026-10-31T00:00:00.000Z",
  officialUrl: "https://example.com/fixtures/FIXTURE-9999",
};

describe("tenderInputSchema", () => {
  it("accepts a valid tender, coercing dates and defaulting the language", () => {
    const result = tenderInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publishedAt).toBeInstanceOf(Date);
      expect(result.data.language).toBe("EN");
    }
  });

  it("rejects a closing date before the publication date", () => {
    const result = tenderInputSchema.safeParse({ ...valid, closesAt: "2026-09-01T00:00:00.000Z" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("closesBeforePublished");
    }
  });

  it("rejects valueMin above valueMax", () => {
    const result = tenderInputSchema.safeParse({ ...valid, valueMin: 300_000 });
    expect(result.success).toBe(false);
  });

  it("allows a tender with no published value", () => {
    const result = tenderInputSchema.safeParse({ ...valid, valueMin: null, valueMax: null });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown region, an empty region list or an unknown category", () => {
    expect(tenderInputSchema.safeParse({ ...valid, regions: ["XX"] }).success).toBe(false);
    expect(tenderInputSchema.safeParse({ ...valid, regions: [] }).success).toBe(false);
    expect(tenderInputSchema.safeParse({ ...valid, categoryCodes: ["nope"] }).success).toBe(false);
  });

  it("keeps several provinces, drops duplicates and collapses all of Canada", () => {
    expect(tenderInputSchema.parse({ ...valid, regions: ["ON", "QC", "ON"] }).regions).toEqual(["ON", "QC"]);
    expect(tenderInputSchema.parse({ ...valid, regions: ["ON", "CA", "QC"] }).regions).toEqual(["CA"]);
  });

  it("defaults the notice kind to a bid with no type text", () => {
    const parsed = tenderInputSchema.parse(valid);
    expect(parsed.noticeKind).toBe("BID");
    expect(parsed.noticeType).toBeNull();
    expect(parsed.solicitationNumber).toBeNull();
    expect(tenderInputSchema.parse({ ...valid, noticeType: "Request for Information", noticeKind: "RFI" }).noticeKind).toBe("RFI");
    expect(tenderInputSchema.safeParse({ ...valid, noticeKind: "nope" }).success).toBe(false);
  });
});
