import type { PgBoss } from "pg-boss";
import type { PrismaClient } from "@/generated/prisma/client";
import { QUEUES } from "@/lib/queues";
import { runJob } from "../run-job";

// Accounts that never confirm their address, and verification rows that
// have expired (Better Auth deletes a reset row when it is used, not when
// it runs out). Weekly, keyed, safe to rerun (docs/plans/account-flow-plan.md,
// D7). An unconfirmed account older than the cutoff with no company
// profile is deleted, which frees the address so the person can sign up
// again correctly, and makes the confirmation email's "nothing is created
// until the link is used" true within the week.
export const UNCONFIRMED_ACCOUNT_CUTOFF_DAYS = 7;
export const AUTH_CLEANUP_CRON = "15 3 * * 0"; // Sundays at 03:15 Toronto time
export const AUTH_CLEANUP_TZ = "America/Toronto";
export const AUTH_CLEANUP_SINGLETON_KEY = "weekly";
export const AUTH_CLEANUP_QUEUE_OPTIONS = { policy: "stately", expireInSeconds: 600, retryLimit: 2, retryDelay: 300 } as const;

export type AuthCleanupDb = Pick<PrismaClient, "user" | "verification">;

export type AuthCleanupSummary = { deletedUsers: number; deletedVerifications: number; cutoff: string };

export async function runAuthCleanup(db: AuthCleanupDb, now: Date = new Date()): Promise<AuthCleanupSummary> {
  const cutoff = new Date(now.getTime() - UNCONFIRMED_ACCOUNT_CUTOFF_DAYS * 24 * 60 * 60 * 1000);
  const users = await db.user.deleteMany({
    where: { emailVerified: false, createdAt: { lt: cutoff }, companyProfile: null },
  });
  const verifications = await db.verification.deleteMany({ where: { expiresAt: { lt: now } } });
  return { deletedUsers: users.count, deletedVerifications: verifications.count, cutoff: cutoff.toISOString() };
}

type Boss = Pick<PgBoss, "createQueue" | "updateQueue" | "schedule" | "work">;

export async function registerAuthCleanupJob(boss: Boss, db: AuthCleanupDb) {
  const { policy, ...options } = AUTH_CLEANUP_QUEUE_OPTIONS;
  await boss.createQueue(QUEUES.authCleanup, { policy, ...options });
  await boss.updateQueue(QUEUES.authCleanup, options);

  await boss.work<unknown>(QUEUES.authCleanup, ([job]) => runJob(QUEUES.authCleanup, job.id, {}, () => runAuthCleanup(db)));

  await boss.schedule(QUEUES.authCleanup, AUTH_CLEANUP_CRON, {}, { tz: AUTH_CLEANUP_TZ, key: AUTH_CLEANUP_SINGLETON_KEY, singletonKey: AUTH_CLEANUP_SINGLETON_KEY });
}
