import { describe, expect, it } from "vitest";
import { SOURCE_ADAPTERS, adapterFor } from "./registry";

describe("the source registry", () => {
  it("registers CanadaBuys only, created active", () => {
    expect(SOURCE_ADAPTERS.map((a) => a.source.code)).toEqual(["canadabuys"]);
    expect(adapterFor("canadabuys").source.active).toBe(true);
  });

  it("refuses an unknown code", () => {
    expect(() => adapterFor("merx")).toThrow(/No source adapter is registered for "merx" \(known: canadabuys\)/);
  });
});
