import { describe, expect, it } from "vitest";
import {
  basicsDefaults,
  basicsFormSchema,
  credentialsDefaults,
  credentialsFormSchema,
  sizeFormSchema,
  workFormSchema,
} from "./form-schemas";

describe("questionnaire form schemas", () => {
  it("turns blank text into null and keeps the shared rules", () => {
    const ok = basicsFormSchema.safeParse({ name: "  Sample  ", website: "", headOfficeProvince: "", capacity: null });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data).toEqual({ name: "Sample", website: null, headOfficeProvince: null, capacity: null });

    const bad = basicsFormSchema.safeParse({ name: "", website: "nope", headOfficeProvince: "", capacity: null });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues.map((i) => [i.path.join("."), i.message])).toEqual([
        ["name", "nameRequired"],
        ["website", "websiteInvalid"],
      ]);
    }
  });

  it("reads amounts with separators and reports a bad one on its own field", () => {
    const ok = sizeFormSchema.safeParse({ sizeMin: "250,000", sizeMax: "$3 000 000", timelinePref: "" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data).toEqual({ sizeMin: 250_000, sizeMax: 3_000_000, timelinePref: null });

    const bad = sizeFormSchema.safeParse({ sizeMin: "lots", sizeMax: "", timelinePref: "10" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0]?.path).toEqual(["sizeMin"]);

    const order = sizeFormSchema.safeParse({ sizeMin: "500000", sizeMax: "100000", timelinePref: "" });
    expect(order.success).toBe(false);
    if (!order.success) expect(order.error.issues[0]).toMatchObject({ path: ["sizeMax"], message: "sizeRangeInvalid" });
  });

  it("requires a category and defaults the language", () => {
    expect(workFormSchema.safeParse({ categories: [], buyerTypes: [], description: "", languages: null }).success).toBe(false);
    const ok = workFormSchema.safeParse({ categories: ["management-consulting"], buyerTypes: [], description: "", languages: null });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data).toMatchObject({ languages: "EN", description: null });
  });

  it("merges ticked certifications with the free-text lines and reads None as no clearance", () => {
    const result = credentialsFormSchema.safeParse({
      knownCertifications: ["SOC 2", "ISO 27001"],
      otherCertifications: "CSA Z1000\n\n  COR  \n",
      bonding: true,
      securityClearance: "none",
      indigenousBusiness: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        certifications: ["SOC 2", "ISO 27001", "CSA Z1000", "COR"],
        bonding: true,
        securityClearance: null,
        indigenousBusiness: true,
      });
    }
    const secret = credentialsFormSchema.safeParse({ knownCertifications: [], otherCertifications: "", bonding: false, securityClearance: "secret", indigenousBusiness: false });
    expect(secret.success && secret.data.securityClearance).toBe("secret");
  });

  it("splits a saved profile back into the form fields", () => {
    const profile = {
      id: "p1",
      name: "Sample",
      website: null,
      headOfficeProvince: "ON",
      capacity: "6-10",
      categories: [],
      buyerTypes: [],
      description: null,
      languages: "EN" as const,
      regions: [],
      sizeMin: null,
      sizeMax: null,
      timelinePref: null,
      certifications: ["SOC 2", "CSA Z1000"],
      bonding: false,
      securityClearance: "reliability",
      indigenousBusiness: false,
      questionnaireStep: 5,
      updatedAt: "2026-10-28T12:00:00.000Z",
    };
    expect(basicsDefaults(profile)).toEqual({ name: "Sample", website: "", headOfficeProvince: "ON", capacity: "6-10" });
    expect(credentialsDefaults(profile)).toEqual({
      knownCertifications: ["SOC 2"],
      otherCertifications: "CSA Z1000",
      bonding: false,
      securityClearance: "reliability",
      indigenousBusiness: false,
    });
    expect(credentialsDefaults(null).securityClearance).toBe("none");
  });
});
