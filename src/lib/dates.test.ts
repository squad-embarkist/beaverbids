import { describe, expect, it } from "vitest";
import { daysUntil } from "./dates";

const now = new Date("2026-10-23T12:00:00.000Z");

describe("daysUntil", () => {
  it("rounds up to whole days and never goes negative", () => {
    expect(daysUntil("2026-10-23T18:00:00.000Z", now)).toBe(1);
    expect(daysUntil("2026-10-23T12:00:00.000Z", now)).toBe(0);
    expect(daysUntil("2026-11-01T12:00:00.000Z", now)).toBe(9);
    expect(daysUntil("2026-11-01T11:00:00.000Z", now)).toBe(9);
    expect(daysUntil("2026-10-01T00:00:00.000Z", now)).toBe(0);
  });
});
