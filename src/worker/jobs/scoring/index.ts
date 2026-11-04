import type { PgBoss } from "pg-boss";
import { QUEUES, enqueueScoreAll, scoreAllJobSchema, scoreProfileJobSchema } from "@/lib/queues";
import { scoreAll } from "@/lib/scoring/run";
import { runJob } from "../run-job";

// Scoring jobs. `score-all` rescores every open tender for every profile;
// `score-profile` does one profile (what PUT /api/profile enqueues in M3).
// Both queues use the "stately" policy with a singleton key, so at most one
// job per key is queued and one is active: a retry or a second request
// never runs beside the original.
//
// Since M4 a full rescore follows each successful import (the ingest
// pipeline enqueues it with reason "ingest"); there is no cron of its own.

// A full rescore can take a while on a big day; give it 30 minutes.
export const SCORING_QUEUE_OPTIONS = { policy: "stately", expireInSeconds: 1800, retryLimit: 2, retryDelay: 60 } as const;

export type ScoringDb = Parameters<typeof scoreAll>[0];

type Boss = Pick<PgBoss, "createQueue" | "updateQueue" | "unschedule" | "work" | "send">;

export async function registerScoringJobs(boss: Boss, db: ScoringDb, { startupRun }: { startupRun: boolean }) {
  // createQueue is a no-op once the queue exists, so the options are applied
  // again with updateQueue.
  const { policy, ...options } = SCORING_QUEUE_OPTIONS;
  for (const queue of [QUEUES.scoreAll, QUEUES.scoreProfile]) {
    await boss.createQueue(queue, { policy, ...options });
    await boss.updateQueue(queue, options);
  }

  await boss.work<unknown>(QUEUES.scoreAll, ([job]) =>
    runJob(QUEUES.scoreAll, job.id, { reason: reasonOf(job.data) }, () => {
      scoreAllJobSchema.parse(job.data);
      return scoreAll(db);
    }),
  );

  // The payload is parsed before anything runs: a job without a profile id
  // fails here and is retried, and never rescores every profile.
  await boss.work<unknown>(QUEUES.scoreProfile, ([job]) =>
    runJob(QUEUES.scoreProfile, job.id, { profileId: profileIdOf(job.data), reason: reasonOf(job.data) }, () => {
      const { profileId } = scoreProfileJobSchema.parse(job.data);
      return scoreAll(db, { profileId });
    }),
  );

  // M2 and M3 scheduled a nightly 06:15 Toronto placeholder under the
  // default key. Remove it from any database that still has it; the import
  // now chains the rescore.
  await boss.unschedule(QUEUES.scoreAll);

  if (startupRun) {
    await enqueueScoreAll(boss, "startup");
  }
}

function reasonOf(data: unknown): unknown {
  return typeof data === "object" && data !== null && "reason" in data ? data.reason : undefined;
}

function profileIdOf(data: unknown): unknown {
  return typeof data === "object" && data !== null && "profileId" in data ? data.profileId : undefined;
}
