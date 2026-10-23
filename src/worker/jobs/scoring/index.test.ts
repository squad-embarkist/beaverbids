import { describe, expect, it, vi } from "vitest";
import { QUEUES, SCORE_ALL_SINGLETON_KEY } from "@/lib/queues";

const scoreAll = vi.hoisted(() => vi.fn(async () => ({ profiles: 1, tenders: 2, scored: 2, modelVersion: "rules-1" })));
vi.mock("@/lib/scoring/run", () => ({ scoreAll }));

import { SCORE_ALL_CRON, SCORE_ALL_TZ, enqueueScoreProfile, registerScoringJobs } from "./index";

type Handler = (jobs: { id: string; data: unknown }[]) => Promise<void>;

function fakeBoss() {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    createQueue: vi.fn(async () => {}),
    schedule: vi.fn(async () => {}),
    send: vi.fn(async () => "job-id"),
    work: vi.fn(async (name: string, handler: Handler) => {
      handlers.set(name, handler);
      return name;
    }),
  };
}

const db = {} as Parameters<typeof registerScoringJobs>[1];

describe("registerScoringJobs", () => {
  it("creates both queues with a stately policy and registers a worker for each", async () => {
    const boss = fakeBoss();
    await registerScoringJobs(boss, db, { schedule: false, startupRun: false });

    expect(boss.createQueue).toHaveBeenCalledWith(QUEUES.scoreAll, expect.objectContaining({ policy: "stately" }));
    expect(boss.createQueue).toHaveBeenCalledWith(QUEUES.scoreProfile, expect.objectContaining({ policy: "stately" }));
    expect([...boss.handlers.keys()]).toEqual([QUEUES.scoreAll, QUEUES.scoreProfile]);
    expect(boss.schedule).not.toHaveBeenCalled();
    expect(boss.send).not.toHaveBeenCalled();
  });

  it("schedules the nightly run in Toronto time with the singleton key", async () => {
    const boss = fakeBoss();
    await registerScoringJobs(boss, db, { schedule: true, startupRun: false });
    expect(boss.schedule).toHaveBeenCalledWith(QUEUES.scoreAll, SCORE_ALL_CRON, { reason: "schedule" }, { tz: SCORE_ALL_TZ, singletonKey: SCORE_ALL_SINGLETON_KEY });
  });

  it("enqueues one startup run when asked", async () => {
    const boss = fakeBoss();
    await registerScoringJobs(boss, db, { schedule: false, startupRun: true });
    expect(boss.send).toHaveBeenCalledWith(QUEUES.scoreAll, { reason: "startup" }, { singletonKey: SCORE_ALL_SINGLETON_KEY });
  });

  it("runs scoreAll for the whole set and for one profile", async () => {
    const boss = fakeBoss();
    await registerScoringJobs(boss, db, { schedule: false, startupRun: false });

    await boss.handlers.get(QUEUES.scoreAll)!([{ id: "j1", data: { reason: "manual" } }]);
    expect(scoreAll).toHaveBeenLastCalledWith(db);

    await boss.handlers.get(QUEUES.scoreProfile)!([{ id: "j2", data: { profileId: "p1", reason: "profileUpdated" } }]);
    expect(scoreAll).toHaveBeenLastCalledWith(db, { profileId: "p1" });
  });

  it("keys a profile job on the profile id", async () => {
    const boss = fakeBoss();
    await enqueueScoreProfile(boss, "p1", "profileUpdated");
    expect(boss.send).toHaveBeenCalledWith(QUEUES.scoreProfile, { profileId: "p1", reason: "profileUpdated" }, { singletonKey: "p1" });
  });
});
