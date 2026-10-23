// pg-boss queue names, shared so the web app (which enqueues) and the worker
// (which processes) agree on them. The worker owns the handlers.
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
