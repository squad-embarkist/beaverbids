import { describe, expect, it } from "vitest";
import {
  companyProfileSchema,
  nextIncompleteStep,
  profileCredentialsSchema,
  profileSizeSchema,
  profileStepSaveSchema,
  profileWorkSchema,
  profileRegionsSchema,
  stepAfter,
  stepBefore,
  stepNumber,
} from "./company-profile";
import { bandForTotal, CATEGORY_CODES, CLEARANCE_LEVELS, REGION_CODES } from "./vocab";

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

describe("profileCredentialsSchema", () => {
  it("accepts each clearance level and none, and defaults the Indigenous flag to false", () => {
    for (const level of CLEARANCE_LEVELS) {
      expect(profileCredentialsSchema.safeParse({ securityClearance: level }).success).toBe(true);
    }
    const result = profileCredentialsSchema.safeParse({ securityClearance: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.indigenousBusiness).toBe(false);
    expect(profileCredentialsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a clearance outside the vocabulary", () => {
    expect(profileCredentialsSchema.safeParse({ securityClearance: "cosmic" }).success).toBe(false);
  });
});

describe("profileStepSaveSchema", () => {
  it("parses a step with its own answers", () => {
    const result = profileStepSaveSchema.safeParse({ step: "regions", answers: { regions: ["ON", "QC"] } });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown step", () => {
    expect(profileStepSaveSchema.safeParse({ step: "extras", answers: {} }).success).toBe(false);
  });

  it("checks the answers against the named step, not another one", () => {
    // Work answers under the regions step: regions is missing.
    const result = profileStepSaveSchema.safeParse({ step: "regions", answers: { categories: ["it-managed-services-cloud"] } });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["answers", "regions"]);
  });

  it("applies step defaults so a sparse credentials save is complete", () => {
    const result = profileStepSaveSchema.safeParse({ step: "credentials", answers: {} });
    expect(result.success).toBe(true);
    if (result.success && result.data.step === "credentials") {
      expect(result.data.answers).toEqual({ certifications: [], bonding: false, indigenousBusiness: false });
    }
  });
});

describe("questionnaire steps", () => {
  it("numbers steps from one and walks forward and back", () => {
    expect(stepNumber("basics")).toBe(1);
    expect(stepNumber("credentials")).toBe(5);
    expect(stepAfter("basics")).toBe("work");
    expect(stepAfter("credentials")).toBeNull();
    expect(stepBefore("basics")).toBeNull();
    expect(stepBefore("size")).toBe("regions");
  });

  it("finds the first incomplete step from the stored count", () => {
    expect(nextIncompleteStep(0)).toBe("basics");
    expect(nextIncompleteStep(2)).toBe("regions");
    expect(nextIncompleteStep(5)).toBeNull();
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
