// Integration test against a real PostgreSQL database (DATABASE_URL): the
// pipeline with the CanadaBuys parser on the sample file, four runs in a
// row, under its own source code so the real CanadaBuys rows are never
// touched. Skipped when DATABASE_URL is unset.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createDiskStore } from "@/lib/storage";
import { runIngest, type IngestSummary } from "./run";
import { createCanadaBuysAdapter } from "./sources/canadabuys";
import { SAMPLE_PATH } from "./sources/canadabuys/sample";
import type { SourceAdapter } from "./sources/types";

const databaseUrl = process.env.DATABASE_URL;
const TEST_SOURCE = { code: "canadabuys-test", name: "CanadaBuys (integration test)", baseUrl: "https://example.com/canadabuys-test", active: false };
const DROPPED = "cb-212-11044757"; // row 5, Wharfhead Repairs
const SILENT = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe.skipIf(!databaseUrl)("runIngest against PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const body = readFileSync(SAMPLE_PATH);
  const boss = { send: vi.fn(async () => "job") };
  let dir = "";

  // The real parser behind a fake download, and an optional filter that
  // stands in for a file with one notice fewer.
  function adapter(without?: string): SourceAdapter {
    const real = createCanadaBuysAdapter({
      fetch: (async () => new Response(body, { status: 200, headers: { "content-type": "text/csv", "last-modified": new Date().toUTCString(), etag: '"test"' } })) as unknown as typeof fetch,
    });
    return {
      ...real,
      source: TEST_SOURCE,
      parse: async (bytes, ctx) => {
        const result = await real.parse(bytes, ctx);
        return without ? { ...result, tenders: result.tenders.filter((t) => t.externalId !== without) } : result;
      },
    };
  }

  function run(a: SourceAdapter, now: Date): Promise<IngestSummary> {
    return runIngest(a, { db: prisma, store: createDiskStore(dir), boss, log: SILENT, now });
  }

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "beaverbids-ingest-int-"));
    await prisma.source.deleteMany({ where: { code: TEST_SOURCE.code } });
  });

  afterAll(async () => {
    // The test source cascades to its tenders, their scores and its runs.
    await prisma.source.deleteMany({ where: { code: TEST_SOURCE.code } });
    await prisma.$disconnect();
    await rm(dir, { recursive: true, force: true });
  });

  it("imports the sample, reruns without duplicates, withdraws a missing notice and restores it", async () => {
    const t0 = new Date("2026-10-24T14:00:00.000Z");

    const first = await run(adapter(), t0);
    expect(first).toMatchObject({ source: TEST_SOURCE.code, rowsFound: 20, inserted: 20, updated: 0, withdrawn: 0, restored: 0, previousRowsFound: null, skipped: { total: 0 } });
    expect(first.file.key).toMatch(/^canadabuys-test\/2026\/10\/24\/openTenderNotice-ouvertAvisAppelOffres-140000Z\.csv$/);
    expect(readFileSync(first.file.location)).toEqual(body);

    const source = await prisma.source.findUniqueOrThrow({ where: { code: TEST_SOURCE.code } });
    expect(source).toMatchObject({ name: TEST_SOURCE.name, active: false, lastSuccessAt: t0 });
    expect(await prisma.tender.count({ where: { sourceId: source.id } })).toBe(20);
    const sample = await prisma.tender.findUniqueOrThrow({ where: { sourceId_externalId: { sourceId: source.id, externalId: "cb-329-8183335" } } });
    expect(sample).toMatchObject({ regions: ["ON", "QC"], noticeKind: "BID", buyerType: "federal", categoryCodes: ["custom-software-saas"], rawFileKey: first.file.key, withdrawnAt: null, language: "EN" });
    expect(boss.send).toHaveBeenCalledWith("score-all", { reason: "ingest" }, { singletonKey: "all" });

    // The operator switches the source on; the run must leave that alone.
    await prisma.source.update({ where: { id: source.id }, data: { active: true } });

    const second = await run(adapter(), new Date("2026-10-25T14:00:00.000Z"));
    expect(second).toMatchObject({ inserted: 0, updated: 20, withdrawn: 0, restored: 0, previousRowsFound: 20 });
    expect(await prisma.tender.count({ where: { sourceId: source.id } })).toBe(20);
    expect((await prisma.source.findUniqueOrThrow({ where: { id: source.id } })).active).toBe(true);

    const t2 = new Date("2026-10-26T14:00:00.000Z");
    const third = await run(adapter(DROPPED), t2);
    expect(third).toMatchObject({ inserted: 0, updated: 19, withdrawn: 1, restored: 0 });
    const gone = await prisma.tender.findUniqueOrThrow({ where: { sourceId_externalId: { sourceId: source.id, externalId: DROPPED } } });
    expect(gone.withdrawnAt).toEqual(t2);
    expect(await prisma.tender.count({ where: { sourceId: source.id, withdrawnAt: null } })).toBe(19);

    const fourth = await run(adapter(), new Date("2026-10-27T14:00:00.000Z"));
    expect(fourth).toMatchObject({ inserted: 0, updated: 20, withdrawn: 0, restored: 1 });
    const back = await prisma.tender.findUniqueOrThrow({ where: { sourceId_externalId: { sourceId: source.id, externalId: DROPPED } } });
    expect(back.withdrawnAt).toBeNull();

    const runs = await prisma.ingestRun.findMany({ where: { sourceId: source.id }, orderBy: { startedAt: "asc" } });
    expect(runs.map((r) => [r.status, r.rowsFound])).toEqual([["SUCCEEDED", 20], ["SUCCEEDED", 20], ["SUCCEEDED", 20], ["SUCCEEDED", 20]]);
    expect(runs[2].summary).toMatchObject({ withdrawn: 1, file: { sha256: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    expect(runs.every((r) => r.finishedAt !== null)).toBe(true);
  });

  it("records a failed run and leaves the rows standing", async () => {
    const source = await prisma.source.findUniqueOrThrow({ where: { code: TEST_SOURCE.code } });
    const broken: SourceAdapter = { ...adapter(), parse: () => ({ tenders: [], skipped: [], unmapped: { categories: {}, regions: {}, buyers: {}, noticeTypes: {} }, rowsFound: 0 }) };

    await expect(run(broken, new Date("2026-10-28T14:00:00.000Z"))).rejects.toMatchObject({ code: "zeroRows" });

    const last = await prisma.ingestRun.findFirstOrThrow({ where: { sourceId: source.id }, orderBy: { startedAt: "desc" } });
    expect(last).toMatchObject({ status: "FAILED", error: expect.stringContaining("no data rows"), rowsFound: null });
    expect(await prisma.tender.count({ where: { sourceId: source.id, withdrawnAt: null } })).toBe(20);
  });
});
