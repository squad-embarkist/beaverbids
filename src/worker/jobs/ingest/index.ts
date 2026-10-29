import type { PgBoss } from "pg-boss";
import { log } from "@/lib/log";
import { QUEUES, enqueueIngest, ingestJobSchema } from "@/lib/queues";
import { runJob } from "../run-job";
import { runIngest, type IngestDeps } from "./run";
import { SOURCE_ADAPTERS, adapterFor } from "./sources/registry";
import type { SourceAdapter } from "./sources/types";

// The ingest queue: one queue for every source, one scheduled job per
// adapter keyed by its source code. The stately policy with the source code
// as singleton key means a retry never runs beside the original and one
// source's failure never blocks another: a job that fails for one source is
// retried on its own key while another source's job runs.
//
// A run may take minutes on a slow download; two retries fifteen minutes
// apart cover a portal that is late publishing its file.
export const INGEST_QUEUE_OPTIONS = { policy: "stately", expireInSeconds: 1800, retryLimit: 2, retryDelay: 900 } as const;

type Boss = Pick<PgBoss, "createQueue" | "updateQueue" | "schedule" | "work" | "send">;

export type RegisterIngestOptions = {
  // Register the cron schedules (off for the tests and tools).
  schedule: boolean;
  // Source codes to import once right after start (INGEST_ON_STARTUP).
  startupSources?: readonly string[];
  adapters?: readonly SourceAdapter[];
};

export async function registerIngestJobs(boss: Boss, deps: Omit<IngestDeps, "boss">, { schedule, startupSources = [], adapters = SOURCE_ADAPTERS }: RegisterIngestOptions) {
  // createQueue is a no-op once the queue exists, so the options are applied
  // again with updateQueue: a change here reaches a database that already
  // has the queue.
  const { policy, ...options } = INGEST_QUEUE_OPTIONS;
  await boss.createQueue(QUEUES.ingest, { policy, ...options });
  await boss.updateQueue(QUEUES.ingest, options);

  // The payload is parsed and the adapter looked up before anything runs,
  // so a job for an unknown source fails here and never touches a table.
  await boss.work<unknown>(QUEUES.ingest, ([job]) =>
    runJob(
      QUEUES.ingest,
      job.id,
      { source: sourceOf(job.data) },
      () => {
        const { source } = ingestJobSchema.parse(job.data);
        const adapter = adapterFor(source, adapters);
        return runIngest(adapter, { ...deps, boss });
      },
      // The pipeline reports its own failures to Sentry with the run id.
      { report: false },
    ),
  );

  if (schedule) {
    for (const adapter of adapters) {
      const code = adapter.source.code;
      // `missed: "once"` sends one job when a deploy straddled the slot.
      await boss.schedule(QUEUES.ingest, adapter.schedule.cron, { source: code }, { tz: adapter.schedule.tz, key: code, singletonKey: code, missed: "once" });
      log.info("ingest scheduled", { source: code, cron: adapter.schedule.cron, tz: adapter.schedule.tz });
    }
  }

  for (const code of startupSources) {
    adapterFor(code, adapters); // a typo in INGEST_ON_STARTUP stops the worker here, loudly
    await enqueueIngest(boss, code);
    log.info("ingest queued at startup", { source: code });
  }
}

function sourceOf(data: unknown): unknown {
  return typeof data === "object" && data !== null && "source" in data ? data.source : undefined;
}
