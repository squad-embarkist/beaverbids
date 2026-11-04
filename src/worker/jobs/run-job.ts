import * as Sentry from "@sentry/node";
import { log } from "@/lib/log";

// Wraps one pg-boss job: logs the outcome either way and rethrows a failure
// so pg-boss still marks the job failed and retries it. Without this a
// thrown error went nowhere: pg-boss records it on the job row only. The
// failure is reported to Sentry unless the job reported it already with
// better tags (the ingest pipeline does, with the source and run id).
export async function runJob(
  queue: string,
  jobId: string,
  fields: Record<string, unknown>,
  run: () => Promise<Record<string, unknown>>,
  { report = true }: { report?: boolean } = {},
) {
  const started = Date.now();
  try {
    const summary = await run();
    log.info(`${queue} finished`, { jobId, ...fields, ms: Date.now() - started, ...summary });
  } catch (error) {
    log.error(`${queue} failed`, { jobId, ...fields, ms: Date.now() - started, error: String(error) });
    if (report) {
      Sentry.captureException(error, { tags: { queue }, extra: { jobId, ...fields } });
    }
    throw error;
  }
}
