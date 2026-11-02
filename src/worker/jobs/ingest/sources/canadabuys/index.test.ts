import { describe, expect, it, vi } from "vitest";
import { IngestError } from "../../errors";
import { CANADABUYS_OPEN_TENDERS_URL, CANADABUYS_SCHEDULE, CANADABUYS_SOURCE, canadabuys, createCanadaBuysAdapter } from "./index";

const SILENT = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("the CanadaBuys adapter", () => {
  it("owns one active source row and the 14:00 UTC schedule", () => {
    expect(canadabuys.source).toEqual({ code: "canadabuys", name: "CanadaBuys", baseUrl: "https://canadabuys.canada.ca/en/tender-opportunities", active: true });
    expect(canadabuys.schedule).toEqual({ cron: "0 14 * * *", tz: "UTC" });
    expect(CANADABUYS_SOURCE.active).toBe(true);
    expect(CANADABUYS_SCHEDULE.tz).toBe("UTC");
  });

  it("downloads the official file and reports the headers the run records", async () => {
    const body = "referenceNumber,title\r\nA,B\r\n";
    const fetchMock = vi.fn(async () => new Response(body, { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "last-modified": "Thu, 29 Oct 2026 10:20:00 GMT", etag: '"0x8DE"' } }));
    const adapter = createCanadaBuysAdapter({ fetch: fetchMock as unknown as typeof fetch });

    const result = await adapter.fetch({ signal: AbortSignal.timeout(5000), log: SILENT });

    expect(fetchMock).toHaveBeenCalledWith(CANADABUYS_OPEN_TENDERS_URL, expect.objectContaining({ redirect: "follow", signal: expect.any(AbortSignal) }));
    expect(result.body.toString("utf8")).toBe(body);
    expect(result).toMatchObject({ contentType: "text/csv", fileName: "openTenderNotice-ouvertAvisAppelOffres.csv", lastModified: new Date("2026-10-29T10:20:00.000Z"), etag: '"0x8DE"' });
  });

  it("uses the override URL and copes with missing headers", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => new Response("x", { status: 200 }));
    const adapter = createCanadaBuysAdapter({ url: "https://staging.example.com/files/open.csv", fetch: fetchMock as unknown as typeof fetch });
    const result = await adapter.fetch({ signal: AbortSignal.timeout(5000), log: SILENT });
    expect(fetchMock.mock.calls[0][0]).toBe("https://staging.example.com/files/open.csv");
    expect(result).toMatchObject({ fileName: "open.csv", lastModified: null, etag: null });
    expect(["text/csv", "text/plain"]).toContain(result.contentType);
  });

  it("fails the download on a non-200 status or a network error", async () => {
    const notFound = createCanadaBuysAdapter({ fetch: (async () => new Response("", { status: 404 })) as unknown as typeof fetch });
    await expect(notFound.fetch({ signal: AbortSignal.timeout(5000), log: SILENT })).rejects.toMatchObject({ name: "IngestError", code: "download", message: expect.stringContaining("HTTP 404") });

    const down = createCanadaBuysAdapter({
      fetch: (async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch,
    });
    const error = await down.fetch({ signal: AbortSignal.timeout(5000), log: SILENT }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(IngestError);
    expect((error as IngestError).message).toContain("fetch failed");
  });
});
