import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, findUnique, listOpportunities } = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  listOpportunities: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ prisma: { companyProfile: { findUnique } } }));
vi.mock("@/lib/opportunities", () => ({ listOpportunities }));

import { GET } from "./route";

const url = "http://localhost:3000/api/opportunities";

describe("GET /api/opportunities", () => {
  beforeEach(() => {
    getSession.mockReset();
    findUnique.mockReset();
    listOpportunities.mockReset();
  });

  it("returns 401 in the shared error shape when nobody is signed in", async () => {
    getSession.mockResolvedValue(null);

    const response = await GET(new Request(url));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
    expect(listOpportunities).not.toHaveBeenCalled();
  });

  it("returns 400 with the failing parameter for bad input", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await GET(new Request(`${url}?limit=500`));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.details[0].path).toBe("limit");
  });

  it("passes the parsed query and the user's profile id through", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    findUnique.mockResolvedValue({ id: "profile-1" });
    listOpportunities.mockResolvedValue({ items: [], nextCursor: null });

    const response = await GET(new Request(`${url}?region=ON&limit=10&q=sample`));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" }, select: { id: true } });
    expect(listOpportunities).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        profileId: "profile-1",
        query: expect.objectContaining({ region: "ON", limit: 10, q: "sample" }),
      }),
    );
    await expect(response.json()).resolves.toEqual({ items: [], nextCursor: null });
  });

  it("still lists tenders for a user without a profile", async () => {
    getSession.mockResolvedValue({ user: { id: "user-2" } });
    findUnique.mockResolvedValue(null);
    listOpportunities.mockResolvedValue({ items: [], nextCursor: null });

    const response = await GET(new Request(url));

    expect(response.status).toBe(200);
    expect(listOpportunities).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ profileId: null }),
    );
  });
});
