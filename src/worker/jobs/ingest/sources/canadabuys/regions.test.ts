import { describe, expect, it } from "vitest";
import { regionCodesFor, tenderRegions } from "./regions";

describe("regionCodesFor", () => {
  it.each([
    ["Ontario", ["ON"]],
    ["Ontario (except NCR)", ["ON"]],
    ["Quebec (except NCR)", ["QC"]],
    ["Québec", ["QC"]],
    ["QUEBEC", ["QC"]],
    ["National Capital Region (NCR)", ["ON", "QC"]],
    ["Nunavut Territory", ["NU"]],
    ["Newfoundland and Labrador", ["NL"]],
    ["Newfoundland", ["NL"]],
    ["Northwest Territories", ["NT"]],
    ["Prince Edward Island", ["PE"]],
    ["Yukon", ["YT"]],
    ["ONTARIO", ["ON"]],
    ["Ont", ["ON"]],
    ["Ontarion", ["ON"]],
    ["Qc", ["QC"]],
    ["BC", ["BC"]],
    ["Wainwright", ["AB"]],
    ["Cold Lake", ["AB"]],
    ["Ottawa", ["ON"]],
    ["Kingston", ["ON"]],
    ["Petawawa", ["ON"]],
    ["Montréal", ["QC"]],
    ["Montréal-Est", ["QC"]],
    ["Gatineau", ["QC"]],
    ["Saint-Hyacinthe", ["QC"]],
    ["Sept-Îles", ["QC"]],
    ["Les Îles-de-la-Madelein", ["QC"]],
    ["Edmonton", ["AB"]],
    ["Winnipeg", ["MB"]],
    ["Churchill", ["MB"]],
    ["Victoria", ["BC"]],
    ["Comox", ["BC"]],
    ["Halifax", ["NS"]],
    ["Oromocto", ["NB"]],
    ["Moncton", ["NB"]],
    ["St. John's", ["NL"]],
    ["Channel-Port aux Basques", ["NL"]],
    ["Charlottetown", ["PE"]],
    ["Iqaluit", ["NU"]],
    ["Cambridge Bay", ["NU"]],
    ["YellowKnife", ["NT"]],
    ["Hay River", ["NT"]],
    ["Dundurn", ["SK"]],
    ["Swift Current", ["SK"]],
  ])("maps %s to %j", (value, codes) => {
    expect(regionCodesFor(value)).toEqual({ codes, known: true });
  });

  it.each(["Canada", "World", "Unspecified", "Foreign", "North America", "Remote Offsite", "Indigenous Lands", "Aboriginal Lands"])("treats %s as all of Canada", (value) => {
    expect(regionCodesFor(value)).toEqual({ codes: ["CA"], known: true });
  });

  it("maps a foreign place to all of Canada and reports it", () => {
    for (const value of ["United States of America", "Asia", "Europe", "Mexico", "Germany", "Japan", "Arizona", "Oceania"]) {
      expect(regionCodesFor(value), value).toEqual({ codes: ["CA"], known: false });
    }
  });

  it("returns nothing for a blank value", () => {
    expect(regionCodesFor("   ")).toEqual({ codes: [], known: true });
  });
});

describe("tenderRegions", () => {
  it("uses the delivery regions first, then the regions of opportunity, then Canada", () => {
    expect(tenderRegions(["British Columbia"], ["World"])).toEqual({ regions: ["BC"], unmapped: [] });
    expect(tenderRegions([], ["National Capital Region (NCR)"])).toEqual({ regions: ["ON", "QC"], unmapped: [] });
    expect(tenderRegions([], [])).toEqual({ regions: ["CA"], unmapped: [] });
  });

  it("collapses any Canada-wide value to CA and reports foreign places", () => {
    expect(tenderRegions(["Ontario", "Canada"], [])).toEqual({ regions: ["CA"], unmapped: [] });
    expect(tenderRegions(["Ontario", "Germany"], [])).toEqual({ regions: ["CA"], unmapped: ["Germany"] });
  });

  it("deduplicates and keeps the file's order", () => {
    const fourteen = ["Northwest Territories", "Nova Scotia", "New Brunswick", "Nunavut Territory", "Newfoundland and Labrador", "Yukon", "British Columbia", "Quebec (except NCR)", "Saskatchewan", "Manitoba", "Prince Edward Island", "Ontario (except NCR)", "National Capital Region (NCR)", "Alberta"];
    expect(tenderRegions(fourteen, [])).toEqual({ regions: ["NT", "NS", "NB", "NU", "NL", "YT", "BC", "QC", "SK", "MB", "PE", "ON", "AB"], unmapped: [] });
  });
});
