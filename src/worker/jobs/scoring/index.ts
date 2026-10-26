import * as Sentry from "@sentry/node";
import type { PgBoss } from "pg-boss";
import { log } from "@/lib/log";
import { QUEUES, SCORE_ALL_SINGLETON_KEY, type ScoreAllJob, type ScoreProfileJob } from "@/lib/queues";
import { scoreAll } from "@/lib/scoring/run";

// Scoring jobs. `score-all` rescores every open tender for every profile;
// `score-profile` does one profile (what PUT /api/profile enqueues in M3).
// Both queues use the "stately" policy with a singleton key, so at most one
// job per key is queued and one is active: a retry or a second request
// never runs beside the original.

// Placeholder until M4 chains scoring after the CanadaBuys import.
export const SCORE_ALL_CRON = "15 6 * * *";
export const SCORE_ALL_TZ = "America/Toronto";

// A full rescore can take a while on a big day; give it 30 minutes.
const QUEUE_OPTIONS = { policy: "stately", expireInSeconds: 1800, retryLimit: 2, retryDelay: 60 } as const;

export type ScoringDb = Parameters<typeof scoreAll>[0];

type Boss = Pick<PgBoss, "createQueue" | "schedule" | "work" | "send">;

export async function registerScoringJobs(boss: Boss, db: ScoringDb, { schedule, startupRun }: { schedule: boolean; startupRun: boolean }) {
  await boss.createQueue(QUEUES.scoreAll, QUEUE_OPTIONS);
  await boss.createQueue(QUEUES.scoreProfile, QUEUE_OPTIONS);

  await boss.work<ScoreAllJob>(QUEUES.scoreAll, ([job]) =>
    runJob(QUEUES.scoreAll, job.id, { reason: job.data.reason }, () => scoreAll(db)),
  );

  await boss.work<ScoreProfileJob>(QUEUES.scoreProfile, ([job]) =>
    runJob(QUEUES.scoreProfile, job.id, { profileId: job.data.profileId, reason: job.data.reason }, () =>
      scoreAll(db, { profileId: job.data.profileId }),
    ),
  );

  if (schedule) {
    const data: ScoreAllJob = { reason: "schedule" };
    await boss.schedule(QUEUES.scoreAll, SCORE_ALL_CRON, data, { tz: SCORE_ALL_TZ, singletonKey: SCORE_ALL_SINGLETON_KEY });
  }

  if (startupRun) {
    await enqueueScoreAll(boss, "startup");
  }
}

// Logs the outcome either way and reports a failure to Sentry before
// rethrowing, so pg-boss still marks the job failed and retries it. Without
// this a thrown error went nowhere: pg-boss records it on the job row only.
async function runJob(queue: string, jobId: string, fields: Record<string, unknown>, run: () => Promise<Record<string, unknown>>) {
  const started = Date.now();
  try {
    const summary = await run();
    log.info(`${queue} finished`, { jobId, ...fields, ms: Date.now() - started, ...summary });
  } catch (error) {
    log.error(`${queue} failed`, { jobId, ...fields, ms: Date.now() - started, error: String(error) });
    Sentry.captureException(error, { tags: { queue }, extra: { jobId, ...fields } });
    throw error;
  }
}

export async function enqueueScoreAll(boss: Pick<PgBoss, "send">, reason: ScoreAllJob["reason"]) {
  const data: ScoreAllJob = { reason };
  return boss.send(QUEUES.scoreAll, data, { singletonKey: SCORE_ALL_SINGLETON_KEY });
}

export async function enqueueScoreProfile(boss: Pick<PgBoss, "send">, profileId: string, reason: ScoreProfileJob["reason"]) {
  const data: ScoreProfileJob = { profileId, reason };
  return boss.send(QUEUES.scoreProfile, data, { singletonKey: profileId });
}
