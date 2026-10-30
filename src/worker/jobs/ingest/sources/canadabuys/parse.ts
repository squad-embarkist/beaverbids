import { parse } from "csv-parse/sync";
import { tenderInputSchema, type TenderInput } from "@/lib/schemas/tender";
import { IngestError } from "../../errors";
import type { ParseContext, ParseResult, SkippedRow, UnmappedValues } from "../types";
import { buyerTypeFor } from "./buyers";
import { COLUMNS, type ColumnKey } from "./columns";
import { categoriesForCodes } from "./categories";
import { noticeKindFor } from "./notice-kind";
import { noticePageUrlFor } from "./notice-url";
import { tenderRegions } from "./regions";
import { cleanHtml, collapseWhitespace, splitStarred } from "./text";

// The CanadaBuys open tender notices file to validated tender rows. Pure:
// no database, no network. One row per notice (the reference number is the
// stable external id); a row that cannot be read is skipped with a reason
// and never fails the run, and every value the tables did not know is
// counted so the tables can grow.

// The dictionary documents closing times as UTC-5 (Eastern Standard Time)
// all year, with no daylight saving adjustment.
export const CLOSING_TIME_OFFSET = "-05:00";

export const MAX_TITLE_LENGTH = 500;

type Row = Record<string, string>;

export function parseCanadaBuys(body: Buffer, ctx: ParseContext): ParseResult {
  const rows = parse(body, { columns: true, bom: true, relax_column_count: false, skip_empty_lines: true }) as Row[];
  if (rows.length > 0) checkHeader(Object.keys(rows[0]));

  const tenders: TenderInput[] = [];
  const skipped: SkippedRow[] = [];
  const unmapped: UnmappedValues = { categories: {}, regions: {}, buyers: {}, noticeTypes: {} };
  const count = (table: Record<string, number>, value: string) => {
    table[value] = (table[value] ?? 0) + 1;
  };

  rows.forEach((row, index) => {
    const n = index + 1;
    const get = (key: ColumnKey) => (row[COLUMNS[key]] ?? "").trim();

    const externalId = get("referenceNumber");
    if (!externalId) {
      skipped.push({ row: n, externalId: null, reason: "missingReference", detail: get("titleEn").slice(0, 80) });
      return;
    }
    const title = collapseWhitespace(get("titleEn") || get("titleFr")).slice(0, MAX_TITLE_LENGTH);
    if (!title) {
      skipped.push({ row: n, externalId, reason: "missingTitle", detail: "" });
      return;
    }

    const closesAt = parseClosing(get("closingDate"));
    if (!closesAt) {
      skipped.push({ row: n, externalId, reason: "invalidClosingDate", detail: get("closingDate") });
      return;
    }
    const publishedAt = parseDay(get("publicationDate")) ?? parseDay(get("amendmentDate")) ?? ctx.existing.get(externalId)?.publishedAt ?? ctx.now;

    const description = cleanHtml(get("descriptionEn")) || cleanHtml(get("descriptionFr")) || title;

    const buyer = collapseWhitespace(get("entityName")) || "Government of Canada";
    const buyerType = buyerTypeFor(buyer);
    if (!buyerType.known) count(unmapped.buyers, buyer);

    const categories = categoriesForCodes(splitStarred(row[COLUMNS.unspsc]), splitStarred(row[COLUMNS.gsin]));
    for (const code of categories.unmapped) count(unmapped.categories, code);

    const regions = tenderRegions(splitStarred(row[COLUMNS.regionsOfDelivery]), splitStarred(row[COLUMNS.regionsOfOpportunity]));
    for (const value of regions.unmapped) count(unmapped.regions, value);

    const noticeType = collapseWhitespace(get("noticeType"));
    const kind = noticeKindFor(noticeType);
    if (!kind.known) count(unmapped.noticeTypes, noticeType);

    const parsed = tenderInputSchema.safeParse({
      externalId,
      title,
      buyer,
      buyerType: buyerType.type,
      description,
      categoryCodes: categories.codes,
      regions: regions.regions,
      valueMin: null,
      valueMax: null,
      publishedAt,
      closesAt,
      language: "EN",
      officialUrl: httpUrl(get("noticeUrl")),
      noticePageUrl: noticePageUrlFor(externalId),
      rawFileKey: ctx.rawFileKey,
      noticeType: noticeType || null,
      noticeKind: kind.kind,
      solicitationNumber: get("solicitationNumber") || null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path.join(".") || "row";
      const reason = issue?.message === "closesBeforePublished" ? "closesBeforePublished" : `schema:${path}`;
      skipped.push({ row: n, externalId, reason, detail: issue ? `${path}: ${issue.message}` : "" });
      return;
    }
    tenders.push(parsed.data);
  });

  return { tenders, skipped, unmapped, rowsFound: rows.length };
}

// Every column the adapter reads must be in the header; a renamed one fails
// the run with the names, which beats skipping 900 rows for a missing title.
export function checkHeader(header: readonly string[]) {
  const present = new Set(header);
  const missing = Object.values(COLUMNS).filter((label) => !present.has(label));
  if (missing.length) {
    throw new IngestError("parse", `canadabuys: the file header lacks ${missing.length} expected column(s): ${missing.join(", ")}`);
  }
}

// "2026-11-13T14:00:00" in the file, Eastern Standard Time.
export function parseClosing(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}${CLOSING_TIME_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "2026-10-06": a calendar day, taken as midnight UTC.
export function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function httpUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
