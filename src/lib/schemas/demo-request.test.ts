import { describe, expect, it } from "vitest";
import { demoRequestSchema } from "./demo-request";

const sample = {
  name: "Jordan Pratt",
  company: "Pratt & Sons Contracting",
  email: "jordan@prattsons.ca",
  province: "Ontario",
  trade: "General contracting",
};

function firstIssue(input: unknown) {
  const result = demoRequestSchema.safeParse(input);
  if (result.success) return null;
  const issue = result.error.issues[0];
  return { path: issue.path.join("."), message: issue.message };
}

describe("demoRequestSchema", () => {
  it("accepts the sample values and trims them", () => {
    const result = demoRequestSchema.safeParse({ ...sample, name: "  Jordan Pratt  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Jordan Pratt");
  });

  it("rejects an empty name with the translation key", () => {
    expect(firstIssue({ ...sample, name: "   " })).toEqual({ path: "name", message: "nameRequired" });
  });

  it("rejects a bad email", () => {
    expect(firstIssue({ ...sample, email: "jordan at prattsons" })).toEqual({
      path: "email",
      message: "emailInvalid",
    });
  });

  it("rejects an over-long trade", () => {
    expect(firstIssue({ ...sample, trade: "x".repeat(81) })).toEqual({ path: "trade", message: "tradeTooLong" });
  });

  it("reports every missing field", () => {
    const result = demoRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(["name", "company", "email", "province", "trade"]);
    }
  });
});
