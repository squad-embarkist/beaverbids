import type { PgBoss } from "pg-boss";
import type { EmailConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";
import type { EmailTransport } from "@/lib/email/transport";
import { QUEUES, sendEmailJobSchema } from "@/lib/queues";
import { runJob } from "../run-job";

// The send-email queue. The web app enqueues one job per transactional
// email from the Better Auth callbacks; this handler renders and sends it.
// Standard policy: two resends to one address are two jobs. A failed send
// is retried three times with backoff (about three minutes in all), and a
// finished row is deleted after an hour because its payload carries the
// link with its token, which must not sit in the archive for the default
// seven days.
export const EMAIL_QUEUE_OPTIONS = {
  policy: "standard",
  expireInSeconds: 120,
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  deleteAfterSeconds: 3600,
} as const;

type Boss = Pick<PgBoss, "createQueue" | "updateQueue" | "work">;

export type EmailJobDeps = {
  transport: EmailTransport;
  config: Pick<EmailConfig, "from" | "supportEmail" | "postalAddress" | "appUrl">;
};

export async function registerEmailJobs(boss: Boss, deps: EmailJobDeps) {
  // createQueue is a no-op once the queue exists, so the options are applied
  // again with updateQueue.
  const { policy, ...options } = EMAIL_QUEUE_OPTIONS;
  await boss.createQueue(QUEUES.sendEmail, { policy, ...options });
  await boss.updateQueue(QUEUES.sendEmail, options);

  // The payload is parsed before anything is rendered: a job with a bad
  // address, an unknown template or a link that is not http(s) fails here.
  // The log fields never include the address; sendEmail logs its hash.
  await boss.work<unknown>(QUEUES.sendEmail, ([job]) =>
    runJob(QUEUES.sendEmail, job.id, { template: templateOf(job.data) }, async () => {
      const data = sendEmailJobSchema.parse(job.data);
      return sendEmail(data, deps);
    }),
  );
}

function templateOf(data: unknown): unknown {
  return typeof data === "object" && data !== null && "template" in data ? data.template : undefined;
}
