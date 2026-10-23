import { describe, expect, it } from "vitest";
import { opportunitiesQuerySchema, queryObjectFrom } from "./opportunities";

describe("opportunitiesQuerySchema", () => {
  it("applies defaults when nothing is passed", () => {
    const result = opportunitiesQuerySchema.parse({});
    expect(result.limit).toBe(25);
    expect(result.sort).toBe("score");
    expect(result.includeIneligible).toBe(false);
  });

  it("coerces strings from the query string", () => {
    const result = opportunitiesQuerySchema.parse({
      limit: "10",
      valueMin: "100000",
      closesBefore: "2026-12-01",
      includeIneligible: "true",
      region: "BC",
    });
    expect(result.limit).toBe(10);
    expect(result.valueMin).toBe(100_000);
    expect(result.closesBefore).toBeInstanceOf(Date);
    expect(result.includeIneligible).toBe(true);
    expect(result.region).toBe("BC");
  });

  it("caps the limit at 100 and rejects 0", () => {
    expect(opportunitiesQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(opportunitiesQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
  });

  it("rejects an unknown band, region or sort", () => {
    expect(opportunitiesQuerySchema.safeParse({ band: "GREAT" }).success).toBe(false);
    expect(opportunitiesQuerySchema.safeParse({ region: "ZZ" }).success).toBe(false);
    expect(opportunitiesQuerySchema.safeParse({ sort: "random" }).success).toBe(false);
  });

  it("rejects valueMin above valueMax", () => {
    const result = opportunitiesQuerySchema.safeParse({ valueMin: "500", valueMax: "100" });
    expect(result.success).toBe(false);
  });
});

describe("queryObjectFrom", () => {
  it("drops empty values and keeps the first of repeated keys", () => {
    const params = new URLSearchParams("q=&region=ON&region=BC&limit=5");
    expect(queryObjectFrom(params)).toEqual({ region: "ON", limit: "5" });
  });
});
