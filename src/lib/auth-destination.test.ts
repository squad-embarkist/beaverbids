import { describe, expect, it, vi } from "vitest";
import { destinationFor } from "./auth-destination";

describe("destinationFor", () => {
  it("sends a finished questionnaire to the list and an unfinished one to its next step", async () => {
    const db = (step: number | null) => ({ companyProfile: { findUnique: vi.fn(async () => (step === null ? null : { questionnaireStep: step })) } });
    await expect(destinationFor(db(null) as never, "u1")).resolves.toBe("/questionnaire/basics");
    await expect(destinationFor(db(2) as never, "u1")).resolves.toBe("/questionnaire/regions");
    await expect(destinationFor(db(5) as never, "u1")).resolves.toBe("/opportunities");
  });
});
