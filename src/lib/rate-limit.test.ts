import { describe, expect, it } from "vitest";
import { RATE_LIMITS, rateLimitKey } from "./rate-limit";

describe("rateLimitKey", () => {
  it("prefixes with app:, hashes the subject and never contains it", () => {
    const key = rateLimitKey("sign-up:ip", "203.0.113.7");
    expect(key).toMatch(/^app:sign-up:ip:[0-9a-f]{16}$/);
    expect(key).not.toContain("203.0.113.7");
    expect(rateLimitKey("resend:cooldown", "Jo@Example.com")).toBe(rateLimitKey("resend:cooldown", " jo@example.com "));
  });

  it("keeps the plan's limits", () => {
    expect(RATE_LIMITS.signUpPerIp).toEqual({ scope: "sign-up:ip", limit: 5, windowSeconds: 3600 });
    expect(RATE_LIMITS.resendCooldown).toEqual({ scope: "resend:cooldown", limit: 1, windowSeconds: 60 });
    expect(RATE_LIMITS.resendPerHour).toEqual({ scope: "resend:hour", limit: 5, windowSeconds: 3600 });
    expect(RATE_LIMITS.signInPerEmail).toEqual({ scope: "sign-in:email", limit: 5, windowSeconds: 900 });
  });
});
