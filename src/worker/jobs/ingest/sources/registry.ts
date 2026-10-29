import type { SourceAdapter } from "./types";

// Every adapter the worker knows. The queue schedules one job per entry and
// INGEST_ON_STARTUP and `npm run ingest -- <code>` look codes up here. Only
// the CanadaBuys open data file may be imported; another portal is added
// here only after its terms review is saved in docs/permissions.
//
// CanadaBuys is registered in commit 4 of the M4 build, which brings the
// adapter itself.
export const SOURCE_ADAPTERS: readonly SourceAdapter[] = [];

export function adapterFor(code: string, adapters: readonly SourceAdapter[] = SOURCE_ADAPTERS): SourceAdapter {
  const adapter = adapters.find((a) => a.source.code === code);
  if (!adapter) {
    const known = adapters.map((a) => a.source.code);
    throw new Error(`No source adapter is registered for ${JSON.stringify(code)}${known.length ? ` (known: ${known.join(", ")})` : ""}`);
  }
  return adapter;
}
