import { describe, expect, it } from "vitest";
import { categoriesForCodes } from "./categories";

describe("categoriesForCodes", () => {
  it.each([
    ["43211608", "it-managed-services-cloud"],
    ["43000000", "it-managed-services-cloud"],
    ["43222501", "cybersecurity-data-protection"],
    ["43231500", "custom-software-saas"],
    ["43233200", "cybersecurity-data-protection"],
    ["81111500", "custom-software-saas"],
    ["81111801", "cybersecurity-data-protection"],
    ["81111811", "it-managed-services-cloud"],
    ["81112003", "it-managed-services-cloud"],
    ["81112200", "custom-software-saas"],
    ["81112208", "cybersecurity-data-protection"],
    ["81110000", "it-managed-services-cloud"],
    ["81161500", "cybersecurity-data-protection"],
    ["81162000", "custom-software-saas"],
    ["81162203", "cybersecurity-data-protection"],
    ["81162305", "cybersecurity-data-protection"],
    ["81162306", "it-managed-services-cloud"],
    ["81160000", "it-managed-services-cloud"],
    ["81101500", "civil-engineering-infrastructure"],
    ["81151600", "civil-engineering-infrastructure"],
    ["72101507", "facilities-janitorial"],
    ["72121101", "commercial-construction"],
    ["72141103", "civil-engineering-infrastructure"],
    ["72151200", "commercial-construction"],
    ["72000000", "commercial-construction"],
    ["76111501", "facilities-janitorial"],
    ["76121900", "facilities-janitorial"],
    ["78101802", "logistics-freight-3pl"],
    ["80101507", "management-consulting"],
    ["80111600", "management-consulting"],
    ["80161500", "management-consulting"],
    ["80161601", "facilities-janitorial"],
    ["80161604", "it-managed-services-cloud"],
    ["84111600", "management-consulting"],
    ["95141700", "commercial-construction"],
    ["42271600", "medical-equipment-pharma"],
    ["51000000", "medical-equipment-pharma"],
  ])("UNSPSC %s is %s", (code, expected) => {
    expect(categoriesForCodes([code], [])).toEqual({ codes: [expected], unmapped: [] });
  });

  it.each([
    ["D302AAR", "it-managed-services-cloud"],
    ["D304A", "it-managed-services-cloud"],
    ["D399BB", "it-managed-services-cloud"],
    ["N7010", "it-managed-services-cloud"],
    ["N7025405", "it-managed-services-cloud"],
    ["JX7025EA", "it-managed-services-cloud"],
    ["N7030", "custom-software-saas"],
    ["N7030AG", "custom-software-saas"],
    ["5111A", "commercial-construction"],
    ["C216C", "civil-engineering-infrastructure"],
    ["E108CA", "facilities-janitorial"],
    ["N4235", "facilities-janitorial"],
    ["V101AA", "logistics-freight-3pl"],
    ["V401J", "logistics-freight-3pl"],
    ["T004K", "management-consulting"],
  ])("GSIN %s is %s", (code, expected) => {
    expect(categoriesForCodes([], [code])).toEqual({ codes: [expected], unmapped: [] });
  });

  it("maps a class to none on purpose without reporting it", () => {
    expect(categoriesForCodes(["43212002", "81111901", "81111900"], [])).toEqual({ codes: [], unmapped: [] });
    expect(categoriesForCodes(["43212002", "43211900"], [])).toEqual({ codes: ["it-managed-services-cloud"], unmapped: [] });
  });

  it("leaves environmental, research, health and goods codes unmapped and reports them", () => {
    expect(categoriesForCodes(["77101500", "85101700", "81141902", "22101500", "41100000"], ["N2310", "T006A"])).toEqual({
      codes: [],
      unmapped: ["77101500", "85101700", "81141902", "22101500", "41100000", "N2310", "T006A"],
    });
  });

  it("deduplicates and keeps the first-seen order", () => {
    expect(categoriesForCodes(["43211608", "43211900", "81111500"], ["D304A"])).toEqual({ codes: ["it-managed-services-cloud", "custom-software-saas"], unmapped: [] });
    expect(categoriesForCodes([" 22101500 ", ""], [" "])).toEqual({ codes: [], unmapped: ["22101500"] });
  });
});
