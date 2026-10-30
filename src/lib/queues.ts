import type { PgBoss } from "pg-boss";
import { z } from "zod";

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

// Job payloads are parsed on both sides. The worker parses before it runs,
// so a score-profile job without a profile id fails instead of falling
// through to a rescore of every profile.
export const scoreAllJobSchema = z.object({
  reason: z.enum(["startup", "schedule", "ingest", "manual"]),
});

export const scoreProfileJobSchema = z.object({
  profileId: z.string().trim().min(1),
  reason: z.enum(["profileUpdated", "manual"]),
});

export type ScoreAllJob = z.infer<typeof scoreAllJobSchema>;
export type ScoreProfileJob = z.infer<typeof scoreProfileJobSchema>;

type Sender = Pick<PgBoss, "send">;

export async function enqueueScoreAll(boss: Sender, reason: ScoreAllJob["reason"]) {
  const data = scoreAllJobSchema.parse({ reason });
  return boss.send(QUEUES.scoreAll, data, { singletonKey: SCORE_ALL_SINGLETON_KEY });
}

// One job per profile at a time. The queue's stately policy allows one job
// per state per key, so repeated saves while a rescore is queued are
// deduplicated (send returns null) and a save during a run queues exactly
// one follow-up.
export async function enqueueScoreProfile(boss: Sender, profileId: string, reason: ScoreProfileJob["reason"]) {
  const data = scoreProfileJobSchema.parse({ profileId, reason });
  return boss.send(QUEUES.scoreProfile, data, { singletonKey: data.profileId });
}
