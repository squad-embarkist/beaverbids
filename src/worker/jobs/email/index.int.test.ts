// Integration test against a real PostgreSQL database (DATABASE_URL): the
// send-email queue registered through pg-boss, one job enqueued the way the
// web app does it, fetched and run by the handler with the file transport,
// and the queue options read back from the database. Skipped when
// DATABASE_URL is unset.
import "dotenv/config";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PgBoss } from "pg-boss";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createFileTransport } from "@/lib/email/transport";
import { QUEUES, enqueueSendEmail } from "@/lib/queues";
import { registerEmailJobs } from "./index";

const databaseUrl = process.env.DATABASE_URL;
const CONFIG = { from: "BeaverBids <hello@beaverbids.ca>", supportEmail: "support@beaverbids.ca", postalAddress: "123 Main Street, Ottawa, Canada", appUrl: "http://localhost:3000" };

type Handler = (jobs: { id: string; data: unknown }[]) => Promise<void>;

describe.skipIf(!databaseUrl)("send-email queue against PostgreSQL", () => {
  const boss = new PgBoss({ connectionString: databaseUrl!, schema: "pgboss", supervise: false, schedule: false });
  let dir = "";
  let handler: Handler | undefined;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "beaverbids-email-int-"));
    await boss.start();
    // The queue and its options come from the registrar; the handler is
    // captured instead of polled so the test runs it itself and a worker
    // running on the same database cannot race for the job.
    const registrar = {
      createQueue: boss.createQueue.bind(boss),
      updateQueue: boss.updateQueue.bind(boss),
      work: vi.fn(async (_name: string, h: Handler) => {
        handler = h;
        return "";
      }),
    };
    await registerEmailJobs(registrar, { transport: createFileTransport(dir), config: CONFIG });
  });

  afterAll(async () => {
    await boss.stop({ graceful: false, timeout: 2_000 });
    await rm(dir, { recursive: true, force: true });
  });

  it("stores the queue options", async () => {
    const queue = await boss.getQueue(QUEUES.sendEmail);
    expect(queue).toMatchObject({ policy: "standard", retryLimit: 3, retryDelay: 30, retryBackoff: true, expireInSeconds: 120, deleteAfterSeconds: 3600 });
  });

  it("enqueues through the schema, runs the handler and writes exactly one file", async () => {
    const to = `int-${Date.now()}@beaverbids.test`;
    const jobId = await enqueueSendEmail(boss, { template: "confirm-email", to, locale: "en", params: { name: "Integration", url: "http://localhost:3000/api/auth/verify-email?token=int&callbackURL=/verify-email" } });
    expect(jobId).toBeTruthy();

    const [job] = await boss.fetch<unknown>(QUEUES.sendEmail);
    expect(job?.id).toBe(jobId);
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    await handler!([{ id: job.id, data: job.data }]);
    consoleLog.mockRestore();
    await boss.complete(QUEUES.sendEmail, job.id);

    const files = await readdir(dir);
    expect(files).toHaveLength(1);
    const stored = JSON.parse(await readFile(path.join(dir, files[0]), "utf8"));
    expect(stored).toMatchObject({ to, from: CONFIG.from, subject: "Confirm your email" });
    expect(stored.text).toContain("http://localhost:3000/api/auth/verify-email?token=int&callbackURL=/verify-email");
  });
});
