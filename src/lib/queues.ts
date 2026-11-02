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
  ingest: "ingest",
  sendEmail: "send-email",
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

// One ingest job imports one source. The code is checked against the
// worker's adapter registry before anything runs, so a job for an unknown
// source fails instead of doing nothing quietly.
export const ingestJobSchema = z.object({
  source: z.string().trim().min(1).max(50),
});

// One transactional email. The web app enqueues it from the Better Auth
// callbacks (never sends in a request), the worker renders and sends it.
// `locale` is the user's language column; `url` is the Better Auth link.
export const EMAIL_TEMPLATES = ["confirm-email", "reset-password"] as const;
export const EMAIL_JOB_LOCALES = ["en"] as const;

export const sendEmailJobSchema = z.object({
  template: z.enum(EMAIL_TEMPLATES),
  to: z.string().trim().toLowerCase().pipe(z.email()),
  locale: z.enum(EMAIL_JOB_LOCALES),
  params: z.object({
    name: z.string().trim().min(1).max(120),
    url: z.url({ protocol: /^https?$/ }),
  }),
});

export type ScoreAllJob = z.infer<typeof scoreAllJobSchema>;
export type ScoreProfileJob = z.infer<typeof scoreProfileJobSchema>;
export type IngestJob = z.infer<typeof ingestJobSchema>;
export type SendEmailJob = z.infer<typeof sendEmailJobSchema>;
export type EmailTemplate = SendEmailJob["template"];

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

// One import per source at a time: the stately policy with the source code
// as the key means a retry never runs beside the original, and a second
// source's job is never blocked by the first.
export async function enqueueIngest(boss: Sender, source: string) {
  const data = ingestJobSchema.parse({ source });
  return boss.send(QUEUES.ingest, data, { singletonKey: data.source });
}

// Emails are never deduplicated: two resends are two jobs. Retries and the
// one-hour deletion are queue options set by the worker (the row carries a
// link and must not sit in the archive for the default seven days).
export async function enqueueSendEmail(boss: Sender, job: SendEmailJob) {
  const data = sendEmailJobSchema.parse(job);
  return boss.send(QUEUES.sendEmail, data);
}
