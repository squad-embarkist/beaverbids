import { describe, expect, it } from "vitest";
import { opportunitiesQuerySchema } from "@/lib/schemas/opportunities";
import { hasFilters, opportunitiesHref } from "./query-url";

describe("opportunitiesHref", () => {
  const query = opportunitiesQuerySchema.parse({ q: "sample", region: "ON", band: "HIGH", cursor: "abc", limit: "25" });

  it("keeps the other filters, drops the cursor and leaves defaults out", () => {
    expect(opportunitiesHref(query, { band: "MEDIUM" })).toBe("/opportunities?q=sample&region=ON&band=MEDIUM");
    expect(opportunitiesHref(query, { band: null })).toBe("/opportunities?q=sample&region=ON");
    expect(opportunitiesHref(opportunitiesQuerySchema.parse({}))).toBe("/opportunities");
  });

  it("keeps the cursor only when the patch sets one", () => {
    expect(opportunitiesHref(query, { cursor: "next" })).toBe("/opportunities?q=sample&region=ON&band=HIGH&cursor=next");
  });

  it("knows whether any filter is set", () => {
    expect(hasFilters(query)).toBe(true);
    expect(hasFilters(opportunitiesQuerySchema.parse({ sort: "closing" }))).toBe(false);
  });
});
