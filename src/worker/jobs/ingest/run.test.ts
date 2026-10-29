import { describe, expect, it, vi } from "vitest";
import { tenderInputSchema, type TenderInput } from "@/lib/schemas/tender";
import type { RawFileStore } from "@/lib/storage";
import { IngestError } from "./errors";
import { MIN_ROW_SHARE, rawFileKeyFor, runIngest, type IngestDeps } from "./run";
import type { ParseResult, SourceAdapter } from "./sources/types";

// The pipeline against a fake adapter, store, database and queue. Every
// failure rule is checked here before the first write; the real database is
// covered by run.int.test.ts once the CanadaBuys adapter exists.

const NOW = new Date("2026-10-29T14:00:12.000Z");
const SILENT = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function input(externalId: string, extra: Partial<TenderInput> = {}): TenderInput {
  return tenderInputSchema.parse({
    externalId,
    title: `Notice ${externalId}`,
    buyer: "Public Works and Government Services Canada",
    buyerType: "federal",
    description: "Supply of managed IT services for a federal department.",
    categoryCodes: ["it-managed-services-cloud"],
    regions: ["ON"],
    publishedAt: new Date("2026-10-20T12:00:00Z"),
    closesAt: new Date("2026-11-20T19:00:00Z"),
    ...extra,
  });
}

function parseResult(ids: string[], extra: Partial<ParseResult> = {}): ParseResult {
  return {
    tenders: ids.map((id) => input(id)),
    skipped: [],
    unmapped: { categories: {}, regions: {}, buyers: {} },
    rowsFound: ids.length,
    ...extra,
  };
}

type Existing = { externalId: string; publishedAt: Date; withdrawnAt: Date | null };

function fakeAdapter(parsed: ParseResult | (() => ParseResult), overrides: Partial<SourceAdapter> = {}): SourceAdapter {
  return {
    source: { code: "testsource", name: "Test source", baseUrl: "https://example.com/tenders", active: false },
    schedule: { cron: "0 14 * * *", tz: "UTC" },
    fetch: vi.fn(async () => ({
      body: Buffer.from("referenceNumber,title\nA,B\n"),
      contentType: "text/csv",
      fileName: "open-notices.csv",
      lastModified: new Date("2026-10-29T10:20:00Z"),
      etag: '"abc"',
    })),
    parse: vi.fn(() => (typeof parsed === "function" ? parsed() : parsed)),
    ...overrides,
  };
}

function fakeDeps({ existing = [], lastRowsFound = null }: { existing?: Existing[]; lastRowsFound?: number | null } = {}) {
  const calls: { createMany: unknown[]; update: unknown[]; updateMany: unknown[]; transactions: number } = { createMany: [], update: [], updateMany: [], transactions: 0 };
  const runUpdates: unknown[] = [];
  const db = {
    source: {
      upsert: vi.fn(async () => ({ id: "src-1" })),
      update: vi.fn(async () => ({})),
    },
    ingestRun: {
      create: vi.fn(async () => ({ id: "run-1" })),
      update: vi.fn(async (args: unknown) => {
        runUpdates.push(args);
        return {};
      }),
      findFirst: vi.fn(async () => (lastRowsFound === null ? null : { rowsFound: lastRowsFound })),
    },
    tender: {
      findMany: vi.fn(async () => existing),
      createMany: vi.fn((args: unknown) => {
        calls.createMany.push(args);
        return args;
      }),
      update: vi.fn((args: unknown) => {
        calls.update.push(args);
        return args;
      }),
      updateMany: vi.fn(async (args: { where: { withdrawnAt: null | { not: null }; externalId: { notIn?: string[]; in?: string[] } } }) => {
        calls.updateMany.push(args);
        if (args.where.withdrawnAt === null) {
          const present = new Set(args.where.externalId.notIn);
          return { count: existing.filter((e) => e.withdrawnAt === null && !present.has(e.externalId)).length };
        }
        return { count: 0 };
      }),
    },
    $transaction: vi.fn(async (ops: unknown[]) => {
      calls.transactions += 1;
      return ops;
    }),
  };
  const stored: { key: string; body: Buffer; contentType: string }[] = [];
  const store: RawFileStore = {
    kind: "disk",
    put: vi.fn(async (key: string, body: Buffer, contentType: string) => {
      stored.push({ key, body, contentType });
      return { key, location: `/raw/${key}` };
    }),
  };
  const boss = { send: vi.fn(async () => "job-1") };
  const sentry = { captureCheckIn: vi.fn(() => "checkin-1"), captureException: vi.fn() };
  const deps: IngestDeps = { db: db as unknown as IngestDeps["db"], store, boss, sentry, log: SILENT, now: NOW, batchSize: 2 };
  return { deps, db, calls, runUpdates, stored, store, boss, sentry };
}

function orderOf(mocks: { mock: { invocationCallOrder: number[] } }[]): number[] {
  return mocks.map((m) => m.mock.invocationCallOrder[0]);
}

describe("runIngest, happy path", () => {
  it("creates the source row from the adapter once and never touches active again", async () => {
    const { deps, db } = fakeDeps();
    await runIngest(fakeAdapter(parseResult(["A"])), deps);

    expect(db.source.upsert).toHaveBeenCalledWith({
      where: { code: "testsource" },
      update: { name: "Test source", baseUrl: "https://example.com/tenders" },
      create: { code: "testsource", name: "Test source", baseUrl: "https://example.com/tenders", active: false },
      select: { id: true },
    });
    expect(db.source.update).toHaveBeenCalledWith({ where: { id: "src-1" }, data: { lastSuccessAt: NOW } });
  });

  it("stores the raw file before parsing, under a dated key with the time", async () => {
    const { deps, stored, store } = fakeDeps();
    const adapter = fakeAdapter(parseResult(["A"]));
    await runIngest(adapter, deps);

    expect(stored).toEqual([{ key: "testsource/2026/10/29/open-notices-140012Z.csv", body: expect.any(Buffer), contentType: "text/csv" }]);
    const [put, parse] = orderOf([store.put as never, adapter.parse as never]);
    expect(put).toBeLessThan(parse);
    expect(adapter.parse).toHaveBeenCalledWith(expect.any(Buffer), { now: NOW, rawFileKey: "testsource/2026/10/29/open-notices-140012Z.csv", existing: expect.any(Map) });
  });

  it("inserts new ids, updates known ones in external id order, and marks what left the file", async () => {
    const existing: Existing[] = [
      { externalId: "B", publishedAt: new Date("2026-10-01T00:00:00Z"), withdrawnAt: null },
      { externalId: "GONE", publishedAt: new Date("2026-10-01T00:00:00Z"), withdrawnAt: null },
      { externalId: "BACK", publishedAt: new Date("2026-10-01T00:00:00Z"), withdrawnAt: new Date("2026-10-20T00:00:00Z") },
    ];
    const { deps, calls, db } = fakeDeps({ existing });
    // Out of order on purpose; the pipeline sorts by external id.
    const summary = await runIngest(fakeAdapter(parseResult(["C", "A", "B", "BACK"])), deps);

    expect(summary).toMatchObject({ source: "testsource", ingestRunId: "run-1", rowsFound: 4, inserted: 2, updated: 2, withdrawn: 1, restored: 1, previousRowsFound: null, warnings: [] });
    // Batches of two in id order: [A, B] then [BACK, C].
    expect(calls.transactions).toBe(2);
    expect(calls.createMany).toHaveLength(2);
    expect((calls.createMany[0] as { data: { externalId: string; sourceId: string; withdrawnAt: null }[] }).data).toEqual([expect.objectContaining({ externalId: "A", sourceId: "src-1", withdrawnAt: null })]);
    expect((calls.createMany[1] as { data: { externalId: string }[] }).data).toEqual([expect.objectContaining({ externalId: "C" })]);
    expect(calls.update.map((u) => (u as { where: { sourceId_externalId: { externalId: string } } }).where.sourceId_externalId.externalId)).toEqual(["B", "BACK"]);
    expect(calls.update[0]).toMatchObject({ data: expect.objectContaining({ title: "Notice B", withdrawnAt: null }) });
    expect((calls.update[0] as { data: Record<string, unknown> }).data).not.toHaveProperty("externalId");

    // Rows not in the file are withdrawn; rows in the file that were withdrawn come back.
    expect(db.tender.updateMany).toHaveBeenNthCalledWith(1, {
      where: { sourceId: "src-1", withdrawnAt: null, externalId: { notIn: ["A", "B", "BACK", "C"] } },
      data: { withdrawnAt: NOW },
    });
    expect(db.tender.updateMany).toHaveBeenNthCalledWith(2, {
      where: { sourceId: "src-1", withdrawnAt: { not: null }, externalId: { in: ["A", "B", "BACK", "C"] } },
      data: { withdrawnAt: null },
    });
  });

  it("keeps a notice present when its row was skipped, so it is not withdrawn", async () => {
    const existing: Existing[] = [{ externalId: "BAD", publishedAt: NOW, withdrawnAt: null }];
    const { deps, db } = fakeDeps({ existing });
    const parsed = parseResult(["A"], { rowsFound: 2, skipped: [{ row: 2, externalId: "BAD", reason: "invalidRow", detail: "closesAt: closesBeforePublished" }] });
    const summary = await runIngest(fakeAdapter(parsed), deps);

    expect(summary.withdrawn).toBe(0);
    expect(summary.skipped).toEqual({ total: 1, byReason: { invalidRow: 1 } });
    expect(db.tender.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: expect.objectContaining({ externalId: { notIn: ["A", "BAD"] } }) }));
  });

  it("counts a duplicate reference number as skipped and writes the first row only", async () => {
    const { deps, calls } = fakeDeps();
    const parsed = parseResult(["A", "A", "B"]);
    parsed.tenders[1] = input("A", { title: "Second copy" });
    const summary = await runIngest(fakeAdapter(parsed), deps);

    expect(summary).toMatchObject({ inserted: 2, skipped: { total: 1, byReason: { duplicateExternalId: 1 } } });
    const written = calls.createMany.flatMap((c) => (c as { data: { externalId: string; title: string }[] }).data);
    expect(written.map((w) => w.title)).toEqual(["Notice A", "Notice B"]);
  });

  it("finishes the run row with the summary, queues score-all and checks in ok", async () => {
    const { deps, runUpdates, boss, sentry } = fakeDeps({ lastRowsFound: 3 });
    const parsed = parseResult(["A", "B", "C"], {
      skipped: [{ row: 4, externalId: null, reason: "missingId", detail: "" }],
      unmapped: { categories: { "99999999": 2, "12345678": 5 }, regions: { Mars: 1 }, buyers: {} },
      rowsFound: 4,
    });
    const summary = await runIngest(fakeAdapter(parsed), deps);

    expect(runUpdates).toHaveLength(1);
    expect(runUpdates[0]).toMatchObject({
      where: { id: "run-1" },
      data: { status: "SUCCEEDED", finishedAt: expect.any(Date), rowsFound: 4, summary: expect.objectContaining({ inserted: 3, previousRowsFound: 3 }) },
    });
    expect(summary.unmapped).toEqual({ categories: [["12345678", 5], ["99999999", 2]], regions: [["Mars", 1]], buyers: [] });
    expect(summary.file).toEqual({
      key: "testsource/2026/10/29/open-notices-140012Z.csv",
      location: "/raw/testsource/2026/10/29/open-notices-140012Z.csv",
      bytes: 26,
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      contentType: "text/csv",
      lastModified: "2026-10-29T10:20:00.000Z",
      etag: '"abc"',
    });

    expect(boss.send).toHaveBeenCalledWith("score-all", { reason: "ingest" }, { singletonKey: "all" });

    expect(sentry.captureCheckIn).toHaveBeenNthCalledWith(
      1,
      { monitorSlug: "ingest-testsource", status: "in_progress" },
      { schedule: { type: "crontab", value: "0 14 * * *" }, timezone: "UTC", checkinMargin: 30, maxRuntime: 45, failureIssueThreshold: 1, recoveryThreshold: 1 },
    );
    expect(sentry.captureCheckIn).toHaveBeenNthCalledWith(2, { monitorSlug: "ingest-testsource", status: "ok", checkInId: "checkin-1", duration: expect.any(Number) });
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("warns, but passes, when the file is older than 36 hours", async () => {
    const { deps } = fakeDeps();
    const adapter = fakeAdapter(parseResult(["A"]), {
      fetch: vi.fn(async () => ({ body: Buffer.from("x"), contentType: "text/csv", fileName: "f.csv", lastModified: new Date("2026-10-27T10:00:00Z"), etag: null })),
    });
    const summary = await runIngest(adapter, deps);
    expect(summary.warnings).toEqual(["staleFile"]);
    expect(SILENT.warn).toHaveBeenCalledWith("ingest file is stale", expect.objectContaining({ source: "testsource" }));
  });

  it("passes at exactly 70 percent of the last successful run", async () => {
    const { deps } = fakeDeps({ lastRowsFound: 10 });
    const summary = await runIngest(fakeAdapter(parseResult(["A", "B", "C", "D", "E", "F", "G"])), deps);
    expect(summary.rowsFound).toBe(7);
    expect(MIN_ROW_SHARE).toBe(0.7);
  });

  it("runs without Sentry when no DSN is set", async () => {
    const { deps } = fakeDeps();
    deps.sentry = undefined;
    await expect(runIngest(fakeAdapter(parseResult(["A"])), deps)).resolves.toMatchObject({ inserted: 1 });
  });
});

describe("runIngest, failure rules (nothing is written)", () => {
  async function expectFailure(adapter: SourceAdapter, deps: ReturnType<typeof fakeDeps>, code: string, message: RegExp) {
    const error = await runIngest(adapter, deps.deps).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(IngestError);
    expect((error as IngestError).code).toBe(code);
    expect((error as IngestError).message).toMatch(message);

    expect(deps.calls.createMany).toHaveLength(0);
    expect(deps.calls.update).toHaveLength(0);
    expect(deps.calls.updateMany).toHaveLength(0);
    expect(deps.db.source.update).not.toHaveBeenCalled();
    expect(deps.boss.send).not.toHaveBeenCalled();

    expect(deps.runUpdates).toEqual([{ where: { id: "run-1" }, data: { status: "FAILED", finishedAt: expect.any(Date), error: expect.stringContaining("IngestError: ") } }]);
    expect(deps.sentry.captureCheckIn).toHaveBeenLastCalledWith({ monitorSlug: "ingest-testsource", status: "error", checkInId: "checkin-1", duration: expect.any(Number) });
    expect(deps.sentry.captureException).toHaveBeenCalledWith(error, { tags: { source: "testsource", ingestRunId: "run-1", ingestError: code } });
    return error as IngestError;
  }

  it("fails on zero data rows", async () => {
    const deps = fakeDeps();
    await expectFailure(fakeAdapter(parseResult([])), deps, "zeroRows", /no data rows/);
    expect(deps.stored).toHaveLength(1); // the empty file is still kept for inspection
  });

  it("fails when every row was skipped", async () => {
    const deps = fakeDeps();
    const parsed = parseResult([], { rowsFound: 3, skipped: [1, 2, 3].map((row) => ({ row, externalId: null, reason: "missingColumn", detail: "referenceNumber" })) });
    await expectFailure(fakeAdapter(parsed), deps, "allRowsSkipped", /all 3 rows were skipped \(missingColumn: 3\)/);
  });

  it("fails under 70 percent of the last successful run", async () => {
    const deps = fakeDeps({ lastRowsFound: 100 });
    const ids = Array.from({ length: 69 }, (_, i) => `N${String(i).padStart(3, "0")}`);
    await expectFailure(fakeAdapter(parseResult(ids)), deps, "rowCountDropped", /69 rows, under 70 percent of the last successful run \(100\)/);
  });

  it("fails on an empty download", async () => {
    const deps = fakeDeps();
    const adapter = fakeAdapter(parseResult(["A"]), {
      fetch: vi.fn(async () => ({ body: Buffer.alloc(0), contentType: "text/csv", fileName: "f.csv", lastModified: null, etag: null })),
    });
    await expectFailure(adapter, deps, "download", /empty body/);
    expect(deps.stored).toHaveLength(0);
    expect(adapter.parse).not.toHaveBeenCalled();
  });

  it("wraps a parser crash as a parse failure", async () => {
    const deps = fakeDeps();
    const adapter = fakeAdapter(() => {
      throw new Error("Invalid Record Length: columns length is 67, got 3 on line 2");
    });
    const error = await expectFailure(adapter, deps, "parse", /the parser failed: Error: Invalid Record Length/);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it("marks the run failed and checks in error when the download throws", async () => {
    const deps = fakeDeps();
    const adapter = fakeAdapter(parseResult(["A"]), {
      fetch: vi.fn(async () => {
        throw new IngestError("download", "testsource: HTTP 503 from https://example.com/open.csv");
      }),
    });
    await expectFailure(adapter, deps, "download", /HTTP 503/);
  });

  it("records an unexpected error too and rethrows it", async () => {
    const deps = fakeDeps();
    const boom = new Error("connection reset");
    deps.db.tender.findMany.mockRejectedValueOnce(boom);
    await expect(runIngest(fakeAdapter(parseResult(["A"])), deps.deps)).rejects.toBe(boom);
    expect(deps.runUpdates[0]).toMatchObject({ data: { status: "FAILED", error: "Error: connection reset" } });
    expect(deps.sentry.captureException).toHaveBeenCalledWith(boom, { tags: { source: "testsource", ingestRunId: "run-1", ingestError: "unexpected" } });
  });
});

describe("rawFileKeyFor", () => {
  it("builds one folder per day with the time and the file's extension", () => {
    expect(rawFileKeyFor("canadabuys", "openTenderNotice-ouvertAvisAppelOffres.csv", NOW)).toBe("canadabuys/2026/10/29/openTenderNotice-ouvertAvisAppelOffres-140012Z.csv");
    expect(rawFileKeyFor("x", "weird name!.json", new Date("2026-01-02T03:04:05Z"))).toBe("x/2026/01/02/weird_name_-030405Z.json");
    expect(rawFileKeyFor("x", "noext", NOW)).toBe("x/2026/10/29/noext-140012Z.csv");
  });
});
