import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The pending cookie helper carries the server-only marker, which only
// Next.js resolves.
vi.mock("server-only", () => ({}));
const getSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ prisma: { companyProfile: { findUnique } } }));

import { GET } from "./route";

const request = (query = "") => new NextRequest(`http://localhost:3000/verify-email${query}`, { headers: { cookie: "bb_pending_email=jordan%40prattsons.ca" } });

describe("GET /verify-email", () => {
  it("sends a dead link back to Check inbox with the banner flag", async () => {
    for (const error of ["TOKEN_EXPIRED", "INVALID_TOKEN", "USER_NOT_FOUND"]) {
      const response = await GET(request(`?error=${error}`));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/check-inbox?error=link");
    }
    expect(getSession).not.toHaveBeenCalled();
  });

  it("sends a confirmed person to the questionnaire and clears the pending cookie", async () => {
    getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    findUnique.mockResolvedValueOnce(null);
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("http://localhost:3000/questionnaire/basics");
    expect(response.headers.get("set-cookie")).toMatch(/bb_pending_email=;.*Expires=Thu, 01 Jan 1970/);
  });

  it("sends a click without a session (an already used link) to log in", async () => {
    getSession.mockResolvedValueOnce(null);
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("http://localhost:3000/sign-in");
  });
});
