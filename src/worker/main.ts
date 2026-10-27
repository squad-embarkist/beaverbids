import * as Sentry from "@sentry/node";
import { PgBoss } from "pg-boss";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import { QUEUES } from "@/lib/queues";
import { registerScoringJobs } from "./jobs/scoring";

const HEARTBEAT_CRON = "* * * * *";

export async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // pg-boss keeps its own tables in the "pgboss" schema. Prisma never models them.
  const boss = new PgBoss({ connectionString, schema: "pgboss" });

  boss.on("error", (error) => {
    log.error("pg-boss error", { error: String(error) });
    Sentry.captureException(error);
  });

  await boss.start();
  log.info("worker started", { node: process.version, queues: Object.values(QUEUES) });

  await boss.createQueue(QUEUES.heartbeat);
  await boss.schedule(QUEUES.heartbeat, HEARTBEAT_CRON);
  await boss.work(QUEUES.heartbeat, async ([job]) => {
    log.info("heartbeat", { jobId: job.id });
  });

  // One beat right away so a fresh deploy shows life before the first cron tick.
  await boss.send(QUEUES.heartbeat, { reason: "startup" });

  // Outside production a fresh database gets scores within seconds of the
  // worker starting; production waits for the schedule (M4: the import).
  await registerScoringJobs(boss, prisma, {
    schedule: true,
    startupRun: process.env.NODE_ENV !== "production",
  });

  const shutdown = async (signal: string) => {
    log.info("worker stopping", { signal });
    try {
      await boss.stop({ graceful: true, timeout: 10_000 });
      await prisma.$disconnect();
      await Sentry.flush(2_000);
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}
