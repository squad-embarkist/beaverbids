import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, findUnique, getOpportunity } = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  getOpportunity: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ prisma: { companyProfile: { findUnique } } }));
vi.mock("@/lib/opportunities", () => ({ getOpportunity }));

import { GET } from "./route";

const url = "http://localhost:3000/api/opportunities/t1";
const ctx = { params: Promise.resolve({ id: "t1" }) };

describe("GET /api/opportunities/[id]", () => {
  beforeEach(() => {
    getSession.mockReset();
    findUnique.mockReset();
    getOpportunity.mockReset();
  });

  it("returns 401 when nobody is signed in", async () => {
    getSession.mockResolvedValue(null);
    const response = await GET(new Request(url), ctx);
    expect(response.status).toBe(401);
    expect(getOpportunity).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown tender", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    findUnique.mockResolvedValue({ id: "profile-1" });
    getOpportunity.mockResolvedValue(null);
    const response = await GET(new Request(url), ctx);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "NOT_FOUND", message: expect.any(String) } });
  });

  it("returns the listing scoped to the user's profile", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    findUnique.mockResolvedValue({ id: "profile-1" });
    getOpportunity.mockResolvedValue({ id: "t1", title: "Sample", score: { placeholder: true } });
    const response = await GET(new Request(url), ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getOpportunity).toHaveBeenCalledWith(expect.anything(), { id: "t1", profileId: "profile-1" });
    await expect(response.json()).resolves.toMatchObject({ id: "t1", title: "Sample" });
  });
});
