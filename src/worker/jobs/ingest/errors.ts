// Why an import run failed, as a code the run row and Sentry can group on.
// Every one of these fails the run before any tender is written: a bad file
// never empties or overwrites the table.
export type IngestErrorCode =
  | "download" // the fetch failed, was not a 200, or returned nothing
  | "parse" // the parser itself threw
  | "zeroRows" // the file had no data rows
  | "allRowsSkipped" // every row failed validation: the columns changed
  | "rowCountDropped"; // under 70 percent of the last successful run

export class IngestError extends Error {
  readonly code: IngestErrorCode;

  constructor(code: IngestErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "IngestError";
    this.code = code;
  }
}
