import { describe, expect, it } from "vitest";
import { checklistState } from "./password-checklist";

describe("checklistState", () => {
  it("ticks the length row at twelve characters", () => {
    expect(checklistState({ password: "x".repeat(11), confirm: "" }).length).toBe(false);
    expect(checklistState({ password: "x".repeat(12), confirm: "" }).length).toBe(true);
  });

  it("ticks the match row only for two equal non-empty boxes", () => {
    expect(checklistState({ password: "", confirm: "" }).match).toBe(false);
    expect(checklistState({ password: "abc", confirm: "ab" }).match).toBe(false);
    expect(checklistState({ password: "abc", confirm: "abc" }).match).toBe(true);
  });

  it("knows the difference from the last password only from the server", () => {
    expect(checklistState({ password: "a-dozen-chars-at-least", confirm: "a-dozen-chars-at-least" }).different).toBe("unknown");
    expect(checklistState({ password: "a-dozen-chars-at-least", confirm: "a-dozen-chars-at-least", sameAsOld: true }).different).toBe("unmet");
  });
});
