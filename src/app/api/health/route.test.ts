import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above imports, so the mock function must be hoisted too.
const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: queryRaw },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("returns 200 with database ok when the query succeeds", async () => {
    queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok", database: "ok" });
  });

  it("returns 503 when the database is unreachable", async () => {
    queryRaw.mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      database: "unreachable",
    });
  });
});
