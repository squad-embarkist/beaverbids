import { describe, expect, it, vi } from "vitest";
import { hashResetToken, holdUntil, minutesLeft, resetLinkFor } from "./password-reset";

describe("password reset helpers", () => {
  it("hashes a token to 64 hex characters, never the token itself", () => {
    const hash = hashResetToken("abc-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("abc");
    expect(hashResetToken("abc-token")).toBe(hash);
    expect(hashResetToken("abc-token2")).not.toBe(hash);
  });

  it("builds the link on the app origin with the raw token in the query", () => {
    expect(resetLinkFor("https://app.example.ca/", "r_aw-tok")).toBe("https://app.example.ca/reset-password?token=r_aw-tok");
  });

  it("rounds the minutes left up and never below zero", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    expect(minutesLeft(new Date("2026-11-03T12:52:10Z"), now)).toBe(53);
    expect(minutesLeft(new Date("2026-11-03T12:00:00Z"), now)).toBe(0);
    expect(minutesLeft(new Date("2026-11-03T11:00:00Z"), now)).toBe(0);
  });

  it("holds until the floor and not past it", async () => {
    vi.useFakeTimers();
    let clock = 1_000;
    const now = () => clock;
    let done = false;
    const pending = holdUntil(1_000, 500, now).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(499);
    expect(done).toBe(false);
    clock = 1_500;
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
    vi.useRealTimers();
  });

  it("returns at once when the floor has passed", async () => {
    await expect(holdUntil(0, 10, () => 100)).resolves.toBeUndefined();
  });
});
