import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import type { PrismaClient } from "@/generated/prisma/client";

// The password reset link, held in our own hands so the token is stored
// hashed (Better Auth 1.7 keeps its reset token in clear as the
// verification identifier, so its two reset endpoints are disabled in
// src/lib/auth.ts). The email carries the raw token; the database holds
// its SHA-256 under the same verification table Better Auth uses, with
// the user id as the value and a 60 minute expiry. Using a link deletes
// its row, the user's other reset rows and every session, and writes the
// new hash with Better Auth's own scrypt, so Better Auth's log in checks
// it exactly as before (docs/plans/account-flow-plan.md, section 6).

// "LINK: Good for 60 minutes" on Forgot password.
export const RESET_LINK_TTL_SECONDS = 60 * 60;
export const RESET_PASSWORD_PATH = "/reset-password";
const IDENTIFIER_PREFIX = "reset-password:";
const CREDENTIAL_PROVIDER = "credential";

export type ResetDb = Pick<PrismaClient, "verification" | "account" | "session" | "user" | "$transaction">;

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function resetLinkFor(appUrl: string, raw: string): string {
  const url = new URL(RESET_PASSWORD_PATH, appUrl);
  url.searchParams.set("token", raw);
  return url.toString();
}

// One new token for the user. Earlier links stay valid until they expire or
// one of them is used; Better Auth behaves the same.
export async function issueResetToken(db: ResetDb, userId: string, now: Date = new Date()): Promise<{ raw: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + RESET_LINK_TTL_SECONDS * 1000);
  await db.verification.create({
    data: { id: randomUUID(), identifier: IDENTIFIER_PREFIX + hashResetToken(raw), value: userId, expiresAt },
  });
  return { raw, expiresAt };
}

export type ResetTokenOwner = { userId: string; email: string; name: string; expiresAt: Date };

// The live token's owner, for the "SIGNED IN AS" card and the minutes left.
// Null for an unknown, used or expired token.
export async function findResetToken(db: ResetDb, raw: string, now: Date = new Date()): Promise<ResetTokenOwner | null> {
  if (!raw) return null;
  const row = await db.verification.findFirst({ where: { identifier: IDENTIFIER_PREFIX + hashResetToken(raw) } });
  if (!row || row.expiresAt <= now) return null;
  const user = await db.user.findUnique({ where: { id: row.value }, select: { id: true, email: true, name: true } });
  if (!user) return null;
  return { userId: user.id, email: user.email, name: user.name, expiresAt: row.expiresAt };
}

export function minutesLeft(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 60_000));
}

export type ResetOutcome = { ok: true; email: string } | { ok: false; reason: "invalid" | "sameAsOld" };

class TokenAlreadyUsed extends Error {}

// Consumes the token and saves the password in one transaction. "Different
// from your last password" is checked first against the stored hash, and
// nothing is written on a match. A token that is used while this runs is
// caught by the delete count, so two submits can never both succeed.
export async function resetPasswordWithToken(db: ResetDb, raw: string, newPassword: string, now: Date = new Date()): Promise<ResetOutcome> {
  const owner = await findResetToken(db, raw, now);
  if (!owner) return { ok: false, reason: "invalid" };

  const account = await db.account.findFirst({ where: { userId: owner.userId, providerId: CREDENTIAL_PROVIDER } });
  if (account?.password && (await verifyPassword({ hash: account.password, password: newPassword }))) {
    return { ok: false, reason: "sameAsOld" };
  }
  const password = await hashPassword(newPassword);

  try {
    await db.$transaction(async (tx) => {
      const consumed = await tx.verification.deleteMany({
        where: { identifier: IDENTIFIER_PREFIX + hashResetToken(raw), expiresAt: { gt: now } },
      });
      if (consumed.count !== 1) throw new TokenAlreadyUsed();
      // "One, then it dies": the user's other reset links die with it.
      await tx.verification.deleteMany({ where: { identifier: { startsWith: IDENTIFIER_PREFIX }, value: owner.userId } });
      if (account) {
        await tx.account.update({ where: { id: account.id }, data: { password } });
      } else {
        await tx.account.create({ data: { id: randomUUID(), accountId: owner.userId, providerId: CREDENTIAL_PROVIDER, userId: owner.userId, password } });
      }
      // "Saving this signs out every other device using the old password."
      await tx.session.deleteMany({ where: { userId: owner.userId } });
    });
  } catch (error) {
    if (error instanceof TokenAlreadyUsed) return { ok: false, reason: "invalid" };
    throw error;
  }
  return { ok: true, email: owner.email };
}

// Holds an action to a floor so a request for an address with an account
// (token written, email queued) takes as long as one without.
export async function holdUntil(startedAt: number, minimumMs: number, now: () => number = Date.now): Promise<void> {
  const left = startedAt + minimumMs - now();
  if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
}
