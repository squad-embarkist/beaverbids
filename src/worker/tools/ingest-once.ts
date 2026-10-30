// `npm run ingest -- <source code>`: runs one import inline, without the
// worker, against DATABASE_URL. The same pipeline the queue runs, so what
// this prints is what the morning job would have done. The rescore is still
// queued through pg-boss, so a worker must have run once against this
// database (it creates the queues); start one afterwards to score the
// notices the run brought in.
import "dotenv/config";
import "../instrument";
import * as Sentry from "@sentry/node";
import { PgBoss } from "pg-boss";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import { createRawFileStore } from "@/lib/storage";
import { runIngest } from "../jobs/ingest/run";
import { SOURCE_ADAPTERS, adapterFor } from "../jobs/ingest/sources/registry";

async function main() {
  const code = process.argv[2];
  if (!code) {
    const known = SOURCE_ADAPTERS.map((a) => a.source.code).join(", ") || "none registered yet";
    throw new Error(`Usage: npm run ingest -- <source code> (known: ${known})`);
  }
  const adapter = adapterFor(code);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const store = createRawFileStore();
  // Send-only, like the web app's instance: the worker owns the queues.
  const boss = new PgBoss({ connectionString, schema: "pgboss", supervise: false, schedule: false, migrate: false });
  await boss.start();

  try {
    const summary = await runIngest(adapter, { db: prisma, store, boss, sentry: process.env.SENTRY_DSN ? Sentry : undefined });
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await boss.stop({ graceful: false });
    await prisma.$disconnect();
    await Sentry.flush(2_000);
  }
}

main().catch((error: unknown) => {
  log.error("ingest tool failed", { error: String(error) });
  process.exit(1);
});
