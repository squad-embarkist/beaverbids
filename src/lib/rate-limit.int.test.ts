// Integration test against a real PostgreSQL database (DATABASE_URL): the
// fixed window on Better Auth's rateLimit table. Skipped when DATABASE_URL
// is unset.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { RATE_LIMIT_KEY_PREFIX, hitRateLimit, peekRateLimit, rateLimitKey } from "./rate-limit";

const databaseUrl = process.env.DATABASE_URL;
const SCOPE = `int-test:${process.pid}`;

describe.skipIf(!databaseUrl)("rate limit against PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const clean = () => prisma.rateLimit.deleteMany({ where: { key: { startsWith: `${RATE_LIMIT_KEY_PREFIX}${SCOPE}` } } });

  beforeAll(clean);
  afterAll(async () => {
    await clean();
    await prisma.$disconnect();
  });

  it("allows N hits, refuses N plus one with the wait, and resets after the window", async () => {
    const rule = { scope: SCOPE, subject: "jordan@prattsons.ca", limit: 3, windowSeconds: 60 };
    const t0 = new Date("2026-11-02T12:00:00Z");

    for (let i = 0; i < 3; i++) {
      await expect(hitRateLimit(prisma, rule, new Date(t0.getTime() + i * 1000))).resolves.toEqual({ allowed: true });
    }
    await expect(hitRateLimit(prisma, rule, new Date(t0.getTime() + 10_000))).resolves.toEqual({ allowed: false, retryAfterSeconds: 50 });
    // A refused hit does not extend the window.
    await expect(hitRateLimit(prisma, rule, new Date(t0.getTime() + 30_000))).resolves.toEqual({ allowed: false, retryAfterSeconds: 30 });
    await expect(peekRateLimit(prisma, rule, new Date(t0.getTime() + 30_000))).resolves.toEqual({ allowed: false, retryAfterSeconds: 30 });

    // The window opened at t0 and closes 60 s later.
    await expect(peekRateLimit(prisma, rule, new Date(t0.getTime() + 60_000))).resolves.toEqual({ allowed: true });
    await expect(hitRateLimit(prisma, rule, new Date(t0.getTime() + 60_000))).resolves.toEqual({ allowed: true });
  });

  it("peek never records a hit and reports a cooldown of one", async () => {
    const rule = { scope: `${SCOPE}:cooldown`, subject: "peek@prattsons.ca", limit: 1, windowSeconds: 60 };
    const t0 = new Date("2026-11-02T12:00:00Z");
    await expect(peekRateLimit(prisma, rule, t0)).resolves.toEqual({ allowed: true });
    await expect(hitRateLimit(prisma, rule, t0)).resolves.toEqual({ allowed: true });
    await expect(peekRateLimit(prisma, rule, new Date(t0.getTime() + 15_000))).resolves.toEqual({ allowed: false, retryAfterSeconds: 45 });
    await expect(peekRateLimit(prisma, rule, new Date(t0.getTime() + 15_000))).resolves.toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it("stores only hashed keys", async () => {
    const rule = { scope: `${SCOPE}:keys`, subject: "secret@prattsons.ca", limit: 1, windowSeconds: 60 };
    await hitRateLimit(prisma, rule);
    const rows = await prisma.rateLimit.findMany({ where: { key: { startsWith: `${RATE_LIMIT_KEY_PREFIX}${SCOPE}:keys` } } });
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe(rateLimitKey(rule.scope, rule.subject));
    expect(rows[0].key).not.toContain("secret");
  });
});
