import { describe, expect, it } from "vitest";
import { NOW, daysFromNow, profile, requirements, tender } from "../test-helpers";
import { daysUntil, scoreTimeline } from "./timeline";

describe("daysUntil", () => {
  it("rounds to whole days and never goes negative", () => {
    expect(daysUntil(daysFromNow(9), NOW)).toBe(9);
    expect(daysUntil(new Date(daysFromNow(9).getTime() - 5 * 60 * 1000), NOW)).toBe(9);
    expect(daysUntil(daysFromNow(0.4), NOW)).toBe(0);
    expect(daysUntil(daysFromNow(-3), NOW)).toBe(0);
  });
});

describe("scoreTimeline (15)", () => {
  it.each([
    { name: "plenty of time, no after-hours", t: {}, p: {}, r: {}, expected: 15 },
    { name: "sample tender: 9 of 10 days, 24/7 with a team of 6 to 10", t: { closesAt: daysFromNow(9) }, p: { capacity: "6-10" }, r: { afterHours: true }, expected: 9 + 3 },
    { name: "closes exactly at the lead time", t: { closesAt: daysFromNow(10) }, p: {}, r: {}, expected: 15 },
    { name: "half the lead time", t: { closesAt: daysFromNow(5) }, p: {}, r: {}, expected: 5 + 5 },
    { name: "closing tomorrow against three weeks", t: { closesAt: daysFromNow(1) }, p: { timelinePref: 21 }, r: {}, expected: 0 + 5 },
    { name: "already closed", t: { closesAt: daysFromNow(-1) }, p: {}, r: {}, expected: 0 + 5 },
    { name: "no lead time set", t: { closesAt: daysFromNow(1) }, p: { timelinePref: null }, r: {}, expected: 15 },
    { name: "lead time of zero", t: { closesAt: daysFromNow(1) }, p: { timelinePref: 0 }, r: {}, expected: 15 },
    { name: "after-hours with a team of 1 to 5", t: {}, p: { capacity: "1-5" }, r: { afterHours: true }, expected: 10 + 2 },
    { name: "after-hours with a team of 11 to 25", t: {}, p: { capacity: "11-25" }, r: { afterHours: true }, expected: 15 },
    { name: "after-hours with no team size given", t: {}, p: { capacity: null }, r: { afterHours: true }, expected: 15 },
    { name: "after-hours with a prototype key as the team size", t: {}, p: { capacity: "constructor" }, r: { afterHours: true }, expected: 15 },
    { name: "after-hours with an unknown band", t: {}, p: { capacity: "toString" }, r: { afterHours: true }, expected: 15 },
  ])("$name", ({ t, p, r, expected }) => {
    const result = scoreTimeline(tender(t), profile(p), requirements(r), NOW);
    expect(result.points).toBe(expected);
    expect(result.max).toBe(15);
  });
});
