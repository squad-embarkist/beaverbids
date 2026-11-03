// Integration test against a real PostgreSQL database (DATABASE_URL): the
// reset token round trip on the verification, account and session tables.
// Skipped when DATABASE_URL is unset.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { findResetToken, hashResetToken, issueResetToken, resetPasswordWithToken } from "./password-reset";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("password reset against PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const email = `reset-int-${process.pid}@beaverbids.test`;
  let userId = "";

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({ data: { id: randomUUID(), email, name: "Reset Int", emailVerified: true } });
    userId = user.id;
    await prisma.account.create({ data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: await hashPassword("old-password-12") } });
    await prisma.session.create({ data: { id: randomUUID(), token: `tok-${randomUUID()}`, userId, expiresAt: new Date(Date.now() + 3_600_000) } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("stores only the hash, finds the owner while live, and refuses it expired", async () => {
    const now = new Date();
    const { raw, expiresAt } = await issueResetToken(prisma, userId, now);
    const rows = await prisma.verification.findMany({ where: { value: userId } });
    expect(rows.map((r) => r.identifier)).toContain(`reset-password:${hashResetToken(raw)}`);
    expect(rows.some((r) => r.identifier.includes(raw))).toBe(false);
    expect(expiresAt.getTime() - now.getTime()).toBe(3_600_000);

    await expect(findResetToken(prisma, raw, now)).resolves.toMatchObject({ userId, email, name: "Reset Int" });
    await expect(findResetToken(prisma, raw, new Date(expiresAt.getTime() + 1))).resolves.toBeNull();
    await expect(findResetToken(prisma, "not-a-token", now)).resolves.toBeNull();
    await expect(findResetToken(prisma, "", now)).resolves.toBeNull();
  });

  it("refuses the old password and writes nothing", async () => {
    const { raw } = await issueResetToken(prisma, userId);
    await expect(resetPasswordWithToken(prisma, raw, "old-password-12")).resolves.toEqual({ ok: false, reason: "sameAsOld" });
    await expect(findResetToken(prisma, raw)).resolves.not.toBeNull();
    await expect(prisma.session.count({ where: { userId } })).resolves.toBe(1);
  });

  it("saves the new hash once, ends every session, kills the other links, and refuses a second use", async () => {
    const other = await issueResetToken(prisma, userId);
    const { raw } = await issueResetToken(prisma, userId);
    await expect(resetPasswordWithToken(prisma, raw, "brand-new-password-12")).resolves.toEqual({ ok: true, email });

    const account = await prisma.account.findFirstOrThrow({ where: { userId, providerId: "credential" } });
    await expect(verifyPassword({ hash: account.password ?? "", password: "brand-new-password-12" })).resolves.toBe(true);
    await expect(prisma.session.count({ where: { userId } })).resolves.toBe(0);
    await expect(prisma.verification.count({ where: { value: userId } })).resolves.toBe(0);

    await expect(resetPasswordWithToken(prisma, raw, "another-password-12")).resolves.toEqual({ ok: false, reason: "invalid" });
    await expect(resetPasswordWithToken(prisma, other.raw, "another-password-12")).resolves.toEqual({ ok: false, reason: "invalid" });
  });
});
