import { createHash } from "node:crypto";
import path from "node:path";
import type * as Sentry from "@sentry/node";
import type { PgBoss } from "pg-boss";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { log as defaultLog } from "@/lib/log";
import { enqueueScoreAll } from "@/lib/queues";
import type { TenderInput } from "@/lib/schemas/tender";
import type { RawFileStore } from "@/lib/storage";
import { IngestError } from "./errors";
import type { ExistingTender, Logger, ParseResult, SkippedRow, SourceAdapter, UnmappedValues } from "./sources/types";

// The import pipeline for one source, pure of pg-boss: the queue handler and
// `npm run ingest -- <code>` both call runIngest. In order: source row, run
// row, Sentry check-in, download, store the raw file, parse, the failure
// checks, write, mark what left the file, finish the run, queue scoring.
//
// Safe to rerun: tenders are keyed on (sourceId, externalId), each attempt
// gets its own run row, and the stored file key carries the time, so a
// retry never overwrites the first attempt's file. Every failure rule runs
// before the first write, so a bad or empty file never touches the table and
// yesterday's notices and scores stand until the next good run.

export type IngestDb = Pick<PrismaClient, "source" | "ingestRun" | "tender" | "$transaction">;

export type IngestSentry = Pick<typeof Sentry, "captureCheckIn" | "captureException" | "captureMessage">;

export type IngestDeps = {
  db: IngestDb;
  store: RawFileStore;
  boss: Pick<PgBoss, "send">;
  // Undefined when SENTRY_DSN is unset: no check-ins, no reports.
  sentry?: IngestSentry;
  log?: Logger;
  now?: Date;
  batchSize?: number;
  fetchTimeoutMs?: number;
};

// A run with fewer data rows than this share of the last successful run's
// count fails (the guide's "far fewer than the last run").
export const MIN_ROW_SHARE = 0.7;

// A file whose Last-Modified is older than this is noted on the run as a
// warning, not a failure: a day without a refresh is the portal's problem
// and our data is simply unchanged.
export const STALE_FILE_HOURS = 36;

// More skipped rows than this share of the file is a Sentry warning (not a
// failure): the run still writes what it could read, and someone looks at
// the skipped reasons that morning.
export const MAX_SKIP_SHARE = 0.1;

export const FETCH_TIMEOUT_MS = 120_000;

// Sentry Crons: one monitor per source, created by the first check-in.
// Margin and runtime in minutes.
export const MONITOR_CHECKIN_MARGIN = 30;
export const MONITOR_MAX_RUNTIME = 45;

const UNMAPPED_TOP = 20;
const SKIPPED_EXAMPLES = 5;

export type IngestSummary = {
  source: string;
  ingestRunId: string;
  rowsFound: number;
  previousRowsFound: number | null;
  inserted: number;
  updated: number;
  withdrawn: number;
  restored: number;
  skipped: { total: number; byReason: Record<string, number> };
  unmapped: { categories: [string, number][]; regions: [string, number][]; buyers: [string, number][]; noticeTypes: [string, number][] };
  file: { key: string; location: string; bytes: number; sha256: string; contentType: string; lastModified: string | null; etag: string | null };
  warnings: string[];
  durationMs: number;
};

export async function runIngest(adapter: SourceAdapter, deps: IngestDeps): Promise<IngestSummary> {
  const { db, store, boss, sentry } = deps;
  const log = deps.log ?? defaultLog;
  const now = deps.now ?? new Date();
  const batchSize = deps.batchSize ?? 100;
  const code = adapter.source.code;
  const started = Date.now();

  // 1. The source row: created from the adapter when missing. `active` is
  // never written again, so switching a portal on or off stays a manual act.
  const { name, baseUrl, active } = adapter.source;
  const source = await db.source.upsert({
    where: { code },
    update: { name, baseUrl },
    create: { code, name, baseUrl, active },
    select: { id: true },
  });
  const run = await db.ingestRun.create({ data: { sourceId: source.id, startedAt: now }, select: { id: true } });
  const fields = { source: code, ingestRunId: run.id };

  // 2. Tell Sentry the run started, and what schedule to expect it on.
  const monitorSlug = `ingest-${code}`;
  const checkInId = sentry?.captureCheckIn(
    { monitorSlug, status: "in_progress" },
    {
      schedule: { type: "crontab", value: adapter.schedule.cron },
      timezone: adapter.schedule.tz,
      checkinMargin: MONITOR_CHECKIN_MARGIN,
      maxRuntime: MONITOR_MAX_RUNTIME,
      failureIssueThreshold: 1,
      recoveryThreshold: 1,
    },
  );

  try {
    // 3. Download.
    log.info("ingest started", fields);
    const fetched = await adapter.fetch({ signal: AbortSignal.timeout(deps.fetchTimeoutMs ?? FETCH_TIMEOUT_MS), log });
    if (fetched.body.length === 0) {
      throw new IngestError("download", `${code}: the download returned an empty body`);
    }

    // 4. Keep the raw bytes before parsing anything.
    const rawFileKey = rawFileKeyFor(code, fetched.fileName, now);
    const stored = await store.put(rawFileKey, fetched.body, fetched.contentType);
    const sha256 = createHash("sha256").update(fetched.body).digest("hex");
    log.info("ingest stored raw file", { ...fields, key: stored.key, location: stored.location, bytes: fetched.body.length });

    const warnings: string[] = [];
    if (fetched.lastModified && now.getTime() - fetched.lastModified.getTime() > STALE_FILE_HOURS * 3_600_000) {
      warnings.push("staleFile");
      log.warn("ingest file is stale", { ...fields, lastModified: fetched.lastModified.toISOString() });
    }

    // 5. Parse against what is already stored for this source.
    const existingRows = await db.tender.findMany({ where: { sourceId: source.id }, select: { externalId: true, publishedAt: true, withdrawnAt: true } });
    const existing = new Map(existingRows.map((t) => [t.externalId, t]));
    let parsed: ParseResult;
    try {
      parsed = await adapter.parse(fetched.body, { now, rawFileKey, existing: existing as ReadonlyMap<string, ExistingTender> });
    } catch (error) {
      if (error instanceof IngestError) throw error;
      throw new IngestError("parse", `${code}: the parser failed: ${String(error)}`, { cause: error });
    }

    // 6. The failure rules, all before the first write.
    if (parsed.rowsFound === 0) {
      throw new IngestError("zeroRows", `${code}: the file has no data rows`);
    }
    const tenders = dedupe(parsed.tenders, parsed.skipped);
    if (tenders.length === 0) {
      throw new IngestError("allRowsSkipped", `${code}: all ${parsed.rowsFound} rows were skipped (${describeReasons(parsed.skipped)})`);
    }
    const previous = await db.ingestRun.findFirst({
      where: { sourceId: source.id, status: "SUCCEEDED", rowsFound: { not: null } },
      orderBy: { startedAt: "desc" },
      select: { rowsFound: true },
    });
    const previousRowsFound = previous?.rowsFound ?? null;
    if (previousRowsFound !== null && parsed.rowsFound < previousRowsFound * MIN_ROW_SHARE) {
      throw new IngestError("rowCountDropped", `${code}: ${parsed.rowsFound} rows, under ${Math.round(MIN_ROW_SHARE * 100)} percent of the last successful run (${previousRowsFound})`);
    }
    logSkipped(log, fields, parsed.skipped);
    const skippedByReason = countBy(parsed.skipped.map((s) => s.reason));
    if (parsed.skipped.length > parsed.rowsFound * MAX_SKIP_SHARE) {
      warnings.push("highSkipRate");
      const message = `${code}: ${parsed.skipped.length} of ${parsed.rowsFound} rows skipped (${Math.round((parsed.skipped.length / parsed.rowsFound) * 100)} percent)`;
      log.warn("ingest skipped many rows", { ...fields, skipped: parsed.skipped.length, rowsFound: parsed.rowsFound, byReason: skippedByReason });
      sentry?.captureMessage(message, { level: "warning", tags: { source: code, ingestRunId: run.id }, extra: { byReason: skippedByReason } });
    }

    // 7. Write. New ids are inserted, known ids updated, in external id order
    // and in batches, each batch one transaction.
    let inserted = 0;
    let updated = 0;
    for (let i = 0; i < tenders.length; i += batchSize) {
      const batch = tenders.slice(i, i + batchSize);
      const fresh = batch.filter((t) => !existing.has(t.externalId));
      const known = batch.filter((t) => existing.has(t.externalId));
      const ops: Prisma.PrismaPromise<unknown>[] = [];
      if (fresh.length) {
        ops.push(db.tender.createMany({ data: fresh.map((t) => ({ ...t, sourceId: source.id, withdrawnAt: null })) }));
      }
      for (const t of known) {
        const { externalId, ...data } = t;
        ops.push(db.tender.update({ where: { sourceId_externalId: { sourceId: source.id, externalId } }, data: { ...data, withdrawnAt: null } }));
      }
      await db.$transaction(ops);
      inserted += fresh.length;
      updated += known.length;
    }

    // Notices still in the file: the rows written plus the skipped rows that
    // carried an id. A notice the file still lists is never withdrawn, even
    // when today's row could not be read; the stored copy stands.
    const present = new Set(tenders.map((t) => t.externalId));
    for (const s of parsed.skipped) if (s.externalId) present.add(s.externalId);
    const presentIds = [...present];
    const restored = presentIds.filter((id) => existing.get(id)?.withdrawnAt != null).length;
    const withdrawnResult = await db.tender.updateMany({
      where: { sourceId: source.id, withdrawnAt: null, externalId: { notIn: presentIds } },
      data: { withdrawnAt: now },
    });
    await db.tender.updateMany({
      where: { sourceId: source.id, withdrawnAt: { not: null }, externalId: { in: presentIds } },
      data: { withdrawnAt: null },
    });

    // 8. Finish the run row.
    const summary: IngestSummary = {
      ...fields,
      rowsFound: parsed.rowsFound,
      previousRowsFound,
      inserted,
      updated,
      withdrawn: withdrawnResult.count,
      restored,
      skipped: { total: parsed.skipped.length, byReason: skippedByReason },
      unmapped: topUnmapped(parsed.unmapped),
      file: {
        key: stored.key,
        location: stored.location,
        bytes: fetched.body.length,
        sha256,
        contentType: fetched.contentType,
        lastModified: fetched.lastModified?.toISOString() ?? null,
        etag: fetched.etag,
      },
      warnings,
      durationMs: Date.now() - started,
    };
    await db.ingestRun.update({
      where: { id: run.id },
      data: { status: "SUCCEEDED", finishedAt: new Date(), rowsFound: parsed.rowsFound, summary: summary as Prisma.InputJsonValue },
    });
    await db.source.update({ where: { id: source.id }, data: { lastSuccessAt: now } });

    // 9. Fresh notices need scores, then tell Sentry the run is done.
    await enqueueScoreAll(boss, "ingest");
    if (sentry && checkInId) {
      sentry.captureCheckIn({ monitorSlug, status: "ok", checkInId, duration: (Date.now() - started) / 1000 });
    }
    log.info("ingest finished", { ...summary, unmapped: undefined, file: summary.file.key });
    return summary;
  } catch (error) {
    // 10. Record the failure everywhere, then rethrow so pg-boss retries.
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const errorCode = error instanceof IngestError ? error.code : "unexpected";
    await db.ingestRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: message.slice(0, 2000) } }).catch((updateError: unknown) => {
      log.error("ingest could not record the failure", { ...fields, error: String(updateError) });
    });
    if (sentry) {
      if (checkInId) sentry.captureCheckIn({ monitorSlug, status: "error", checkInId, duration: (Date.now() - started) / 1000 });
      sentry.captureException(error, { tags: { source: code, ingestRunId: run.id, ingestError: errorCode } });
    }
    log.error("ingest failed", { ...fields, errorCode, error: message });
    throw error;
  }
}

// <code>/<yyyy>/<mm>/<dd>/<file stem>-<HHmmss>Z<ext>: one folder per day,
// the time so a retry's file sits beside the first attempt's.
export function rawFileKeyFor(code: string, fileName: string, now: Date): string {
  const iso = now.toISOString(); // 2026-10-29T14:00:12.345Z
  const [date, time] = iso.split("T");
  const [yyyy, mm, dd] = date.split("-");
  const hhmmss = time.slice(0, 8).replace(/:/g, "");
  const ext = path.extname(fileName) || ".csv";
  const stem = path.basename(fileName, ext).replace(/[^A-Za-z0-9._-]+/g, "_") || "file";
  return `${code}/${yyyy}/${mm}/${dd}/${stem}-${hhmmss}Z${ext}`;
}

// A file that lists the same notice twice would make createMany fail on the
// unique key. The first row wins and the rest are counted as skipped.
function dedupe(tenders: TenderInput[], skipped: SkippedRow[]): TenderInput[] {
  const seen = new Set<string>();
  const kept: TenderInput[] = [];
  tenders.forEach((t, i) => {
    if (seen.has(t.externalId)) {
      skipped.push({ row: i + 1, externalId: t.externalId, reason: "duplicateExternalId", detail: "a second row with the same reference number" });
      return;
    }
    seen.add(t.externalId);
    kept.push(t);
  });
  return kept.sort((a, b) => (a.externalId < b.externalId ? -1 : a.externalId > b.externalId ? 1 : 0));
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  return counts;
}

function describeReasons(skipped: SkippedRow[]): string {
  return Object.entries(countBy(skipped.map((s) => s.reason)))
    .map(([reason, n]) => `${reason}: ${n}`)
    .join(", ");
}

function topUnmapped(unmapped: UnmappedValues): IngestSummary["unmapped"] {
  const top = (counts: Record<string, number>): [string, number][] =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, UNMAPPED_TOP);
  return { categories: top(unmapped.categories), regions: top(unmapped.regions), buyers: top(unmapped.buyers), noticeTypes: top(unmapped.noticeTypes) };
}

// Skipped rows never fail the run; the first few of each reason are logged
// so a column change shows up in the worker log the morning it happens.
function logSkipped(log: Logger, fields: Record<string, unknown>, skipped: SkippedRow[]) {
  const byReason = new Map<string, SkippedRow[]>();
  for (const s of skipped) {
    const list = byReason.get(s.reason) ?? [];
    list.push(s);
    byReason.set(s.reason, list);
  }
  for (const [reason, rows] of byReason) {
    log.warn("ingest skipped rows", {
      ...fields,
      reason,
      count: rows.length,
      examples: rows.slice(0, SKIPPED_EXAMPLES).map((r) => ({ row: r.row, externalId: r.externalId, detail: r.detail })),
    });
  }
}
