import { PgBoss } from "pg-boss";
import { log } from "@/lib/log";

// The web app's pg-boss instance: it only sends jobs. Supervision,
// scheduling and migrations stay with the worker, which also creates the
// queues. One instance per process, kept on globalThis in development like
// the Prisma client, because Next.js reloads modules on every change.
//
// `start()` throws when the worker has never run against this database
// (schema missing or behind). Callers treat a failed send as non-fatal: the
// save still succeeds and the nightly score-all catches up.

const globalForBoss = globalThis as unknown as { boss?: Promise<PgBoss> };

async function createBoss(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const boss = new PgBoss({
    connectionString,
    schema: "pgboss",
    supervise: false,
    schedule: false,
    migrate: false,
  });
  boss.on("error", (error) => log.error("pg-boss error (web)", { error: String(error) }));
  await boss.start();
  return boss;
}

export function getBoss(): Promise<PgBoss> {
  if (!globalForBoss.boss) {
    globalForBoss.boss = createBoss().catch((error: unknown) => {
      // Let the next call try again rather than caching the failure.
      globalForBoss.boss = undefined;
      throw error;
    });
  }
  return globalForBoss.boss;
}
