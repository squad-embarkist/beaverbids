import type { log } from "@/lib/log";
import type { TenderInput } from "@/lib/schemas/tender";

// One source portal is one adapter: it owns one source row, says when the
// portal refreshes, downloads the data and turns it into the shared tender
// shape with a stable external id per notice. The runner (../run.ts), the
// queue, scoring and the screens never see a source's own format, so a new
// portal is one folder under sources/ and one line in the registry, and
// starts only after its terms review is saved in docs/permissions.

export type Logger = typeof log;

export type SourceAdapter = {
  // The source row this adapter owns, created on its first run. `active` is
  // the starting value only: the run never changes it afterwards, so the
  // operator decides when a portal's notices reach scoring and the list.
  // CanadaBuys starts active; every later adapter starts inactive.
  source: { code: string; name: string; baseUrl: string; active: boolean };
  // When the portal refreshes. The ingest queue schedules one job per
  // adapter with this cron, keyed by the source code, and the Sentry Crons
  // monitor is created from it.
  schedule: { cron: string; tz: string };
  // Download the current file. Must resolve only with a complete, successful
  // response; anything else (a non-200 status, a network error) throws, and
  // the runner records the failure. The signal aborts a slow download.
  fetch(ctx: FetchContext): Promise<FetchResult>;
  // Parse the bytes into validated rows plus what was skipped and what could
  // not be mapped. Pure: no database, no network. `existing` carries the
  // rows already stored for this source, so an adapter can keep a first-seen
  // date when the file has none.
  parse(body: Buffer, ctx: ParseContext): ParseResult | Promise<ParseResult>;
};

export type FetchContext = { signal: AbortSignal; log: Logger };

export type FetchResult = {
  body: Buffer;
  contentType: string;
  // The file's own name with its extension, used in the stored key.
  fileName: string;
  lastModified: Date | null;
  etag: string | null;
};

export type ExistingTender = { publishedAt: Date };

export type ParseContext = { now: Date; rawFileKey: string; existing: ReadonlyMap<string, ExistingTender> };

export type SkippedRow = {
  // 1-based data row number in the file
  row: number;
  // The notice id when the row had one, so the runner still counts the
  // notice as present in the file (a skipped row is not a withdrawn one).
  externalId: string | null;
  reason: string;
  detail: string;
};

// Values the adapter's tables did not know, with how often each appeared.
// Reported on the run summary (top 20 per table) so the tables can grow.
export type UnmappedValues = {
  categories: Record<string, number>;
  regions: Record<string, number>;
  buyers: Record<string, number>;
  noticeTypes: Record<string, number>;
};

export type ParseResult = {
  tenders: TenderInput[];
  skipped: SkippedRow[];
  unmapped: UnmappedValues;
  // Data rows in the file before any skipping; zero fails the run.
  rowsFound: number;
};
