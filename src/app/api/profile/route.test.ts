import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, getProfile, saveProfileStep, requestRescore } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getProfile: vi.fn(),
  saveProfileStep: vi.fn(),
  requestRescore: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile")>();
  return { ...actual, getProfile, saveProfileStep, requestRescore };
});

import { ProfileMissingError } from "@/lib/profile";
import { GET, PUT } from "./route";

const url = "http://localhost:3000/api/profile";

function put(body: unknown) {
  return new Request(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

const saved = { id: "profile-1", name: "Sample", questionnaireStep: 1 };

describe("GET /api/profile", () => {
  beforeEach(() => {
    getSession.mockReset();
    getProfile.mockReset();
  });

  it("returns 401 when nobody is signed in", async () => {
    getSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: { code: "UNAUTHORIZED", message: expect.any(String) } });
  });

  it("returns 404 before the questionnaire has started", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getProfile.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(404);
    expect(getProfile).toHaveBeenCalledWith({}, "user-1");
  });

  it("returns the profile", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getProfile.mockResolvedValue(saved);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(saved);
  });
});

describe("PUT /api/profile", () => {
  beforeEach(() => {
    getSession.mockReset();
    saveProfileStep.mockReset();
    requestRescore.mockReset();
    getSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns 401 when nobody is signed in", async () => {
    getSession.mockResolvedValue(null);
    const response = await PUT(put({ step: "basics", answers: { name: "Sample" } }));
    expect(response.status).toBe(401);
    expect(saveProfileStep).not.toHaveBeenCalled();
  });

  it("returns 400 for a body that is not JSON", async () => {
    const response = await PUT(new Request(url, { method: "PUT", body: "name=Sample" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 with the failing paths for bad answers", async () => {
    const response = await PUT(put({ step: "work", answers: { categories: [] } }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.details[0]).toEqual({ path: "answers.categories", message: "categoriesRequired" });
    expect(saveProfileStep).not.toHaveBeenCalled();
  });

  it("returns 400 for a step outside the five", async () => {
    const response = await PUT(put({ step: "extras", answers: {} }));
    expect(response.status).toBe(400);
  });

  it("returns 409 when a later step arrives before basics", async () => {
    saveProfileStep.mockRejectedValue(new ProfileMissingError());
    const response = await PUT(put({ step: "regions", answers: { regions: ["ON"] } }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: { code: "CONFLICT", message: expect.any(String) } });
    expect(requestRescore).not.toHaveBeenCalled();
  });

  it("saves the parsed step for the session user and queues a rescore with the stored id", async () => {
    saveProfileStep.mockResolvedValue(saved);
    requestRescore.mockResolvedValue(true);

    const response = await PUT(put({ step: "basics", answers: { name: "  Sample  ", website: null } }));

    expect(response.status).toBe(200);
    expect(saveProfileStep).toHaveBeenCalledWith({}, "user-1", {
      step: "basics",
      answers: { name: "Sample", website: null },
    });
    expect(requestRescore).toHaveBeenCalledWith("profile-1");
    await expect(response.json()).resolves.toEqual({ ...saved, rescoreQueued: true });
  });

  it("still returns 200 when the rescore could not be queued", async () => {
    saveProfileStep.mockResolvedValue(saved);
    requestRescore.mockResolvedValue(false);
    const response = await PUT(put({ step: "basics", answers: { name: "Sample" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ rescoreQueued: false });
  });
});
