import type { PgBoss } from "pg-boss";

// pg-boss queue names, job shapes and the enqueue helpers, shared so the web
// app (which enqueues) and the worker (which processes) agree on them. The
// worker owns the handlers; nothing here imports worker code, so a route
// handler can enqueue without pulling the worker into its bundle.
export const QUEUES = {
  heartbeat: "heartbeat",
  scoreAll: "score-all",
  scoreProfile: "score-profile",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// Singleton keys stop a retry from running beside the original.
export const SCORE_ALL_SINGLETON_KEY = "all";

export type ScoreAllJob = { reason: "startup" | "schedule" | "ingest" | "manual" };
export type ScoreProfileJob = { profileId: string; reason: "profileUpdated" | "manual" };

type Sender = Pick<PgBoss, "send">;

export async function enqueueScoreAll(boss: Sender, reason: ScoreAllJob["reason"]) {
  const data: ScoreAllJob = { reason };
  return boss.send(QUEUES.scoreAll, data, { singletonKey: SCORE_ALL_SINGLETON_KEY });
}

// One job per profile at a time: a second profile save while the first is
// still queued does not add a second run.
export async function enqueueScoreProfile(boss: Sender, profileId: string, reason: ScoreProfileJob["reason"]) {
  const data: ScoreProfileJob = { profileId, reason };
  return boss.send(QUEUES.scoreProfile, data, { singletonKey: profileId });
}
