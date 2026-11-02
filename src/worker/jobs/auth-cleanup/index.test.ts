import { describe, expect, it, vi } from "vitest";
import { QUEUES } from "@/lib/queues";
import { AUTH_CLEANUP_CRON, AUTH_CLEANUP_QUEUE_OPTIONS, AUTH_CLEANUP_SINGLETON_KEY, registerAuthCleanupJob, runAuthCleanup } from "./index";

function fakeDb() {
  return {
    user: { deleteMany: vi.fn(async () => ({ count: 2 })) },
    verification: { deleteMany: vi.fn(async () => ({ count: 7 })) },
  };
}

describe("runAuthCleanup", () => {
  it("deletes unconfirmed accounts older than 7 days with no profile, and expired verification rows", async () => {
    const db = fakeDb();
    const now = new Date("2026-11-09T08:00:00Z");
    const summary = await runAuthCleanup(db as never, now);

    expect(db.user.deleteMany).toHaveBeenCalledWith({
      where: { emailVerified: false, createdAt: { lt: new Date("2026-11-02T08:00:00Z") }, companyProfile: null },
    });
    expect(db.verification.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } });
    expect(summary).toEqual({ deletedUsers: 2, deletedVerifications: 7, cutoff: "2026-11-02T08:00:00.000Z" });
  });
});

describe("registerAuthCleanupJob", () => {
  it("creates a stately queue, registers the handler and one weekly keyed schedule", async () => {
    const boss = { createQueue: vi.fn(async () => {}), updateQueue: vi.fn(async () => {}), schedule: vi.fn(async () => {}), work: vi.fn(async () => "") };
    await registerAuthCleanupJob(boss, fakeDb() as never);

    const { policy, ...options } = AUTH_CLEANUP_QUEUE_OPTIONS;
    expect(policy).toBe("stately");
    expect(boss.createQueue).toHaveBeenCalledWith(QUEUES.authCleanup, AUTH_CLEANUP_QUEUE_OPTIONS);
    expect(boss.updateQueue).toHaveBeenCalledWith(QUEUES.authCleanup, options);
    expect(boss.work).toHaveBeenCalledWith(QUEUES.authCleanup, expect.any(Function));
    expect(boss.schedule).toHaveBeenCalledWith(QUEUES.authCleanup, AUTH_CLEANUP_CRON, {}, { tz: "America/Toronto", key: AUTH_CLEANUP_SINGLETON_KEY, singletonKey: AUTH_CLEANUP_SINGLETON_KEY });
  });
});
