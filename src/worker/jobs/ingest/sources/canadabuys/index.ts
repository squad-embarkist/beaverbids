import path from "node:path";
import { IngestError } from "../../errors";
import type { FetchContext, FetchResult, SourceAdapter } from "../types";
import { parseCanadaBuys } from "./parse";

// CanadaBuys, the Government of Canada's tender portal. The open tender
// notices file is published daily under the Open Government Licence -
// Canada, refreshed between 7:00 and 8:30 Eastern (UTC-5), so the import
// runs at 14:00 UTC, with two retries fifteen minutes apart from the queue.
// The only source imported without written permission (CLAUDE.md).

export const CANADABUYS_OPEN_TENDERS_URL = "https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv";

// The tender opportunities listing. Notice pages live under it by reference
// number (notice-url.ts).
export const CANADABUYS_BASE_URL = "https://canadabuys.canada.ca/en/tender-opportunities";

export const CANADABUYS_SOURCE = {
  code: "canadabuys",
  name: "CanadaBuys",
  baseUrl: CANADABUYS_BASE_URL,
  // The launch source: active from its first run (plan decision 9).
  active: true,
} as const;

export const CANADABUYS_SCHEDULE = { cron: "0 14 * * *", tz: "UTC" } as const;

export type CanadaBuysOptions = {
  // CANADABUYS_OPEN_TENDERS_URL overrides the official URL for staging or tests.
  url?: string;
  fetch?: typeof fetch;
};

export function createCanadaBuysAdapter({ url = CANADABUYS_OPEN_TENDERS_URL, fetch: doFetch = fetch }: CanadaBuysOptions = {}): SourceAdapter {
  return {
    source: CANADABUYS_SOURCE,
    schedule: CANADABUYS_SCHEDULE,

    async fetch({ signal, log }: FetchContext): Promise<FetchResult> {
      log.info("canadabuys download", { url });
      let response: Response;
      try {
        response = await doFetch(url, { signal, headers: { accept: "text/csv, */*", "user-agent": "BeaverBids ingest (+https://beaverbids.ca)" }, redirect: "follow" });
      } catch (error) {
        throw new IngestError("download", `canadabuys: download failed: ${String(error)}`, { cause: error });
      }
      if (response.status !== 200) {
        throw new IngestError("download", `canadabuys: HTTP ${response.status} from ${url}`);
      }
      const body = Buffer.from(await response.arrayBuffer());
      const lastModifiedHeader = response.headers.get("last-modified");
      const lastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : null;
      return {
        body,
        contentType: response.headers.get("content-type")?.split(";")[0].trim() || "text/csv",
        fileName: path.basename(new URL(url).pathname) || "openTenderNotice.csv",
        lastModified: lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : null,
        etag: response.headers.get("etag"),
      };
    },

    parse: parseCanadaBuys,
  };
}

export const canadabuys = createCanadaBuysAdapter({ url: process.env.CANADABUYS_OPEN_TENDERS_URL?.trim() || undefined });
