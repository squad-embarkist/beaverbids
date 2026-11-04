import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { shortHash } from "@/lib/hash";

// Rate limits for the server actions. Better Auth's own limiter only sees
// HTTP calls to /api/auth/*, not the auth.api.* calls the actions make, so
// the actions apply the same idea here, on Better Auth's rateLimit table
// (docs/plans/account-flow-plan.md, section 6). Fixed window: the first
// hit opens a window of `windowSeconds`, later hits count against it, and
// a hit past the limit is refused with the seconds left. Keys are
// "app:<scope>:<hash>", so the table never stores an address or an IP and
// never collides with Better Auth's own rows.

export type RateLimitRule = {
  scope: string;
  // The address, the IP, or whatever the limit is per. Hashed before use.
  subject: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimitDb = Pick<PrismaClient, "$queryRaw">;

export const RATE_LIMIT_KEY_PREFIX = "app:";

export function rateLimitKey(scope: string, subject: string): string {
  return `${RATE_LIMIT_KEY_PREFIX}${scope}:${shortHash(subject)}`;
}

type Row = { count: number; lastRequest: bigint };

// Records one hit and says whether it was inside the limit. One statement,
// so two requests racing for the same key never both read the old count.
export async function hitRateLimit(db: RateLimitDb, rule: RateLimitRule, now: Date = new Date()): Promise<RateLimitResult> {
  const key = rateLimitKey(rule.scope, rule.subject);
  const nowMs = BigInt(now.getTime());
  const windowMs = BigInt(rule.windowSeconds * 1000);
  const id = `${key}:${rule.windowSeconds}`;
  const rows = await db.$queryRaw<Row[]>(Prisma.sql`
    INSERT INTO "rateLimit" ("id", "key", "count", "lastRequest")
    VALUES (${id}, ${key}, 1, ${nowMs})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rateLimit"."lastRequest" + ${windowMs} <= ${nowMs} THEN 1 ELSE "rateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "rateLimit"."lastRequest" + ${windowMs} <= ${nowMs} THEN ${nowMs} ELSE "rateLimit"."lastRequest" END
    RETURNING "count", "lastRequest"
  `);
  return resultFrom(rows[0], rule, now, "hit");
}

// Reads the state without recording a hit: what Check inbox renders so the
// countdown shows the cooldown left without spending a resend.
export async function peekRateLimit(db: RateLimitDb, rule: RateLimitRule, now: Date = new Date()): Promise<RateLimitResult> {
  const key = rateLimitKey(rule.scope, rule.subject);
  const rows = await db.$queryRaw<Row[]>(Prisma.sql`SELECT "count", "lastRequest" FROM "rateLimit" WHERE "key" = ${key}`);
  const row = rows[0];
  if (!row) return { allowed: true };
  const windowEnd = Number(row.lastRequest) + rule.windowSeconds * 1000;
  if (windowEnd <= now.getTime()) return { allowed: true };
  return resultFrom(row, rule, now, "peek");
}

// After a hit the row's count includes it, so the hit was inside the limit
// when count <= limit. A peek asks whether the NEXT hit would be, so the
// window is spent once count reaches the limit.
function resultFrom(row: Row | undefined, rule: RateLimitRule, now: Date, mode: "hit" | "peek"): RateLimitResult {
  if (!row) throw new Error("rate limit statement returned no row");
  if (mode === "hit" ? row.count <= rule.limit : row.count < rule.limit) return { allowed: true };
  const retryAfterMs = Number(row.lastRequest) + rule.windowSeconds * 1000 - now.getTime();
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}

// The limits from the plan, in one place so the actions and the tests agree.
export const RATE_LIMITS = {
  // Sign-up: 5 per hour per IP.
  signUpPerIp: { scope: "sign-up:ip", limit: 5, windowSeconds: 3600 },
  // Log in: 10 per 15 minutes per IP and 5 per 15 minutes per address.
  signInPerIp: { scope: "sign-in:ip", limit: 10, windowSeconds: 900 },
  signInPerEmail: { scope: "sign-in:email", limit: 5, windowSeconds: 900 },
  // Resend the confirmation: one per 60 seconds per address (the drawn
  // "AVAILABLE IN" countdown) and 5 per hour.
  resendCooldown: { scope: "resend:cooldown", limit: 1, windowSeconds: 60 },
  resendPerHour: { scope: "resend:hour", limit: 5, windowSeconds: 3600 },
  // Forgot password: one per 60 seconds and 5 per hour per address, 20 per
  // hour per IP. The same limits for every address, whether or not it has
  // an account, so the answer never says.
  forgotCooldown: { scope: "forgot:cooldown", limit: 1, windowSeconds: 60 },
  forgotPerEmail: { scope: "forgot:email", limit: 5, windowSeconds: 3600 },
  forgotPerIp: { scope: "forgot:ip", limit: 20, windowSeconds: 3600 },
  // Set new password: 10 submits per hour per IP.
  resetPerIp: { scope: "reset:ip", limit: 10, windowSeconds: 3600 },
} as const satisfies Record<string, Omit<RateLimitRule, "subject">>;
