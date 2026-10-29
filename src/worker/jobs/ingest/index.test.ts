import { describe, expect, it, vi } from "vitest";
import { QUEUES, enqueueIngest } from "@/lib/queues";
import type { SourceAdapter } from "./sources/types";

const runIngest = vi.hoisted(() => vi.fn(async () => ({ source: "alpha", inserted: 1 })));
vi.mock("./run", () => ({ runIngest }));

const captureException = vi.hoisted(() => vi.fn());
vi.mock("@sentry/node", () => ({ captureException }));

import { INGEST_QUEUE_OPTIONS, registerIngestJobs } from "./index";

type Handler = (jobs: { id: string; data: unknown }[]) => Promise<void>;

function fakeBoss() {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    createQueue: vi.fn(async () => {}),
    updateQueue: vi.fn(async () => {}),
    schedule: vi.fn(async () => {}),
    send: vi.fn(async () => "job-id"),
    work: vi.fn(async (name: string, handler: Handler) => {
      handlers.set(name, handler);
      return name;
    }),
  };
}

function adapter(code: string, cron: string, tz = "UTC"): SourceAdapter {
  return {
    source: { code, name: code, baseUrl: `https://${code}.example.com`, active: false },
    schedule: { cron, tz },
    fetch: vi.fn(),
    parse: vi.fn(),
  };
}

const alpha = adapter("alpha", "0 14 * * *");
const beta = adapter("beta", "30 11 * * *", "America/Regina");
const deps = { db: {} as never, store: { kind: "disk" as const, put: vi.fn() }, log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } };

describe("registerIngestJobs", () => {
  it("creates the ingest queue with the stately policy and reapplies the options", async () => {
    const boss = fakeBoss();
    await registerIngestJobs(boss, deps, { schedule: false, adapters: [alpha] });

    const { policy, ...options } = INGEST_QUEUE_OPTIONS;
    expect(policy).toBe("stately");
    expect(boss.createQueue).toHaveBeenCalledWith(QUEUES.ingest, { policy: "stately", expireInSeconds: 1800, retryLimit: 2, retryDelay: 900 });
    expect(boss.updateQueue).toHaveBeenCalledWith(QUEUES.ingest, options);
    expect([...boss.handlers.keys()]).toEqual([QUEUES.ingest]);
    expect(boss.schedule).not.toHaveBeenCalled();
    expect(boss.send).not.toHaveBeenCalled();
  });

  it("schedules one job per adapter, keyed by source code, catching up one missed slot", async () => {
    const boss = fakeBoss();
    await registerIngestJobs(boss, deps, { schedule: true, adapters: [alpha, beta] });

    expect(boss.schedule).toHaveBeenCalledTimes(2);
    expect(boss.schedule).toHaveBeenNthCalledWith(1, QUEUES.ingest, "0 14 * * *", { source: "alpha" }, { tz: "UTC", key: "alpha", singletonKey: "alpha", missed: "once" });
    expect(boss.schedule).toHaveBeenNthCalledWith(2, QUEUES.ingest, "30 11 * * *", { source: "beta" }, { tz: "America/Regina", key: "beta", singletonKey: "beta", missed: "once" });
  });

  it("schedules nothing when no adapter is registered", async () => {
    const boss = fakeBoss();
    await registerIngestJobs(boss, deps, { schedule: true, adapters: [] });
    expect(boss.schedule).not.toHaveBeenCalled();
  });

  it("runs the adapter named in the job with the shared deps and the queue", async () => {
    const boss = fakeBoss();
    await registerIngestJobs(boss, deps, { schedule: false, adapters: [alpha, beta] });

    await boss.handlers.get(QUEUES.ingest)!([{ id: "j1", data: { source: "beta" } }]);
    expect(runIngest).toHaveBeenCalledWith(beta, { ...deps, boss });
  });

  it("fails a job for an unknown, empty or missing source before anything runs", async () => {
    const boss = fakeBoss();
    await registerIngestJobs(boss, deps, { schedule: false, adapters: [alpha] });
    runIngest.mockClear();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(boss.handlers.get(QUEUES.ingest)!([{ id: "j2", data: { source: "merx" } }])).rejects.toThrow(/No source adapter is registered for "merx" \(known: alpha\)/);
    await expect(boss.handlers.get(QUEUES.ingest)!([{ id: "j3", data: {} }])).rejects.toThrow();
    await expect(boss.handlers.get(QUEUES.ingest)!([{ id: "j4", data: null }])).rejects.toThrow();
    await expect(boss.handlers.get(QUEUES.ingest)!([{ id: "j5", data: { source: "" } }])).rejects.toThrow();
    await expect(boss.handlers.get(QUEUES.ingest)!([{ id: "j6", data: { source: "   " } }])).rejects.toThrow();
    await expect(boss.handlers.get(QUEUES.ingest)!([{ id: "j7", data: { source: 42 } }])).rejects.toThrow();

    expect(runIngest).not.toHaveBeenCalled();
    // The pipeline reports its own failures with the run id; the wrapper does not report twice.
    expect(captureException).not.toHaveBeenCalled();
    const line = JSON.parse(consoleError.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "error", message: `${QUEUES.ingest} failed`, jobId: "j2", source: "merx" });
    consoleError.mockRestore();
  });

  it("queues the startup sources once, and refuses an unknown one", async () => {
    const boss = fakeBoss();
    await registerIngestJobs(boss, deps, { schedule: false, adapters: [alpha, beta], startupSources: ["beta"] });
    expect(boss.send).toHaveBeenCalledTimes(1);
    expect(boss.send).toHaveBeenCalledWith(QUEUES.ingest, { source: "beta" }, { singletonKey: "beta" });

    const other = fakeBoss();
    await expect(registerIngestJobs(other, deps, { schedule: false, adapters: [alpha], startupSources: ["canadabuy"] })).rejects.toThrow(/No source adapter is registered for "canadabuy"/);
    expect(other.send).not.toHaveBeenCalled();
  });

  it("enqueueIngest keys the job on the source code", async () => {
    const boss = fakeBoss();
    await enqueueIngest(boss, "alpha");
    expect(boss.send).toHaveBeenCalledWith(QUEUES.ingest, { source: "alpha" }, { singletonKey: "alpha" });
    await expect(enqueueIngest(boss, "  ")).rejects.toThrow();
  });
});
