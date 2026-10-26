import { describe, expect, it } from "vitest";
import { clampPoints, roundPoints } from "./types";

describe("roundPoints", () => {
  it.each([
    [6.4, 6],
    [6.5, 7],
    [9, 9],
    [0, 0],
  ])("%s -> %s", (value, expected) => {
    expect(roundPoints(value)).toBe(expected);
  });
});

describe("clampPoints", () => {
  it.each([
    [12, 15, 12],
    [20, 15, 15],
    [-3, 15, 0],
    [Number.NaN, 15, 0],
    [Number.POSITIVE_INFINITY, 15, 0],
  ])("%s within 0..%s -> %s", (value, max, expected) => {
    expect(clampPoints(value, max)).toBe(expected);
  });
});
