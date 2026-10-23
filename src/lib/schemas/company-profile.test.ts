import { describe, expect, it } from "vitest";
import {
  companyProfileSchema,
  profileSizeSchema,
  profileWorkSchema,
  profileRegionsSchema,
} from "./company-profile";
import { bandForTotal, CATEGORY_CODES, REGION_CODES } from "./vocab";

const valid = {
  name: "Sample Technology Partners Inc.",
  categories: ["it-managed-services-cloud"],
  regions: ["ON"],
};

describe("companyProfileSchema", () => {
  it("accepts a minimal profile and applies defaults", () => {
    const result = companyProfileSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.buyerTypes).toEqual([]);
      expect(result.data.languages).toBe("EN");
      expect(result.data.certifications).toEqual([]);
      expect(result.data.bonding).toBe(false);
    }
  });

  it("rejects codes outside the vocabulary", () => {
    const result = companyProfileSchema.safeParse({ ...valid, categories: ["plumbing"] });
    expect(result.success).toBe(false);
  });

  it("requires at least one category and one region", () => {
    expect(profileWorkSchema.safeParse({ categories: [] }).success).toBe(false);
    expect(profileRegionsSchema.safeParse({ regions: [] }).success).toBe(false);
  });

  it("rejects sizeMin above sizeMax with the sizeRangeInvalid key on sizeMax", () => {
    const result = profileSizeSchema.safeParse({ sizeMin: 500_000, sizeMax: 100_000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["sizeMax"]);
      expect(result.error.issues[0]?.message).toBe("sizeRangeInvalid");
    }
  });

  it("allows an open-ended size range", () => {
    expect(profileSizeSchema.safeParse({ sizeMin: 250_000 }).success).toBe(true);
    expect(profileSizeSchema.safeParse({ sizeMax: null }).success).toBe(true);
  });

  it("rejects an invalid website", () => {
    const result = companyProfileSchema.safeParse({ ...valid, website: "not a url" });
    expect(result.success).toBe(false);
  });
});

describe("vocab", () => {
  it("has ten categories and fourteen regions", () => {
    expect(CATEGORY_CODES).toHaveLength(10);
    expect(REGION_CODES).toHaveLength(14);
    expect(REGION_CODES[0]).toBe("CA");
  });

  it("maps totals to bands at 75 and 50", () => {
    expect(bandForTotal(100)).toBe("HIGH");
    expect(bandForTotal(75)).toBe("HIGH");
    expect(bandForTotal(74)).toBe("MEDIUM");
    expect(bandForTotal(50)).toBe("MEDIUM");
    expect(bandForTotal(49)).toBe("LOW");
    expect(bandForTotal(0)).toBe("LOW");
  });
});
